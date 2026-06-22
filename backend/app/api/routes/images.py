from fastapi import APIRouter, Depends, File, UploadFile, HTTPException, Form, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import Optional, List
from uuid import UUID
from datetime import datetime
from ...db.database import get_db
from ...api.dependencies.auth import get_current_user
from ...services.b2_storage import b2_storage
from ...services.vision_service import vision_service
from ...models.patient import Patient
from ...models.image import Image
from ...tools.xray_tools import (
    analyze_medical_image,
    save_image_analysis,
    get_patient_images,
    get_images_by_type,
    delete_image,
    get_image_types,
    get_image_type_display_names
)
import io
import json
import base64

router = APIRouter()

# ========== IMAGE UPLOAD & ANALYSIS ==========

@router.post("/upload/{patient_id}")
async def upload_image(
    patient_id: str,
    file: UploadFile = File(...),
    analyze: bool = Form(True),
    image_type: str = Form("chest_xray"),
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Upload medical image and optionally analyze it"""
    
    # Validate image type
    valid_types = get_image_types()
    if image_type not in valid_types:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid image type. Must be one of: {', '.join(valid_types)}"
        )
    
    allowed_types = ["image/jpeg", "image/png", "image/jpg"]
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail=f"File type {file.content_type} not allowed")
    
    # Get patient
    patient = db.query(Patient).filter(Patient.id == UUID(patient_id)).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    
    file_data = await file.read()
    image_base64 = base64.b64encode(file_data).decode('utf-8')
    
    # Upload to B2
    result = b2_storage.upload_image(
        file_data=file_data,
        file_name=file.filename,
        patient_id=patient_id,
        content_type=file.content_type
    )
    
    if not result["success"]:
        raise HTTPException(status_code=500, detail=result["error"])
    
    response = {
        "message": "Image uploaded successfully",
        "file_key": result["file_key"],
        "public_url": result["public_url"],
        "patient_id": patient_id,
        "image_type": image_type
    }
    
    # Analyze image
    if analyze:
        # Get analysis based on image type
        analysis_result = analyze_medical_image(image_base64, image_type)
        
        if analysis_result.get("success"):
            # Save to Image model (new table)
            save_result = save_image_analysis(
                patient_id=patient_id,
                image_base64=image_base64,
                image_type=image_type,
                analysis_result=analysis_result,
                db=db
            )
            
            if save_result.get("success"):
                response["analysis"] = analysis_result
                response["analysis_saved"] = True
                response["image_id"] = save_result.get("image_id")
                
                # Also save to patient's analysis_history (for backward compatibility)
                analysis_entry = {
                    "id": str(result["file_key"]),
                    "image_type": image_type,
                    "image_url": result["public_url"],
                    "findings": analysis_result.get("findings"),
                    "confidence": analysis_result.get("confidence"),
                    "recommendation": analysis_result.get("recommendation"),
                    "analyzed_at": datetime.now().isoformat(),
                    "file_name": file.filename,
                    "image_id": save_result.get("image_id")
                }
                
                current_history = patient.analysis_history or []
                current_history.append(analysis_entry)
                patient.analysis_history = current_history
                db.commit()
            else:
                response["analysis_error"] = save_result.get("error")
        else:
            response["analysis_error"] = analysis_result.get("error")
    
    return response

# ========== GET IMAGES ==========

@router.get("/analysis/{patient_id}")
async def get_patient_analysis(
    patient_id: str,
    image_type: Optional[str] = Query(None, description="Filter by image type"),
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all image analysis results for a patient"""
    
    patient = db.query(Patient).filter(Patient.id == UUID(patient_id)).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    
    # Get from new Image model
    images = get_patient_images(patient_id, image_type, db)
    
    # Also get from analysis_history (backward compatibility)
    history_analyses = patient.analysis_history or []
    
    # Combine and deduplicate (prefer new Image model)
    image_ids = {img.get("id") for img in images}
    combined = list(images)
    
    for hist in history_analyses:
        if hist.get("image_id") not in image_ids and hist.get("id") not in image_ids:
            combined.append(hist)
    
    return {
        "patient_id": patient_id,
        "patient_name": patient.name,
        "analyses": combined,
        "count": len(combined),
        "image_types": get_image_type_display_names()
    }

@router.get("/search")
async def search_images_by_type_endpoint(
    image_type: str = Query(..., description="Image type to search for"),
    patient_name: Optional[str] = Query(None, description="Filter by patient name"),
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Search images by type (X-Ray, CT, MRI, ECG, Retinal)"""
    
    # Validate image type
    valid_types = get_image_types()
    if image_type not in valid_types:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid image type. Must be one of: {', '.join(valid_types)}"
        )
    
    images = get_images_by_type(image_type, db, patient_name)
    
    display_name = get_image_type_display_names().get(image_type, image_type)
    
    return {
        "success": True,
        "image_type": image_type,
        "display_name": display_name,
        "count": len(images),
        "images": images
    }

@router.get("/patient/{patient_id}/types")
async def get_patient_image_types(
    patient_id: str,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all image types for a patient with counts"""
    
    patient = db.query(Patient).filter(Patient.id == UUID(patient_id)).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    
    # Get from new Image model
    images = db.query(Image).filter(Image.patient_id == patient_id).all()
    
    # Count by type
    type_counts = {}
    for img in images:
        display_name = get_image_type_display_names().get(img.image_type, img.image_type)
        if display_name not in type_counts:
            type_counts[display_name] = 0
        type_counts[display_name] += 1
    
    # Also check analysis_history
    history_types = {}
    for hist in (patient.analysis_history or []):
        img_type = hist.get("image_type", "unknown")
        display_name = get_image_type_display_names().get(img_type, img_type)
        if display_name not in history_types:
            history_types[display_name] = 0
        history_types[display_name] += 1
    
    # Combine counts
    combined_types = {}
    for key in set(type_counts.keys()) | set(history_types.keys()):
        combined_types[key] = type_counts.get(key, 0) + history_types.get(key, 0)
    
    return {
        "success": True,
        "patient_id": patient_id,
        "patient_name": patient.name,
        "types": combined_types,
        "total": sum(combined_types.values()),
        "image_types": get_image_type_display_names()
    }

# ========== DELETE IMAGE ==========

@router.delete("/{image_id}")
async def delete_image_endpoint(
    image_id: str,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete an image"""
    
    result = delete_image(image_id, db)
    
    if not result.get("success"):
        raise HTTPException(status_code=404, detail=result.get("error", "Image not found"))
    
    return result

# ========== ANALYZE WITHOUT STORING ==========

@router.post("/analyze")
async def analyze_uploaded_image(
    file: UploadFile = File(...),
    image_type: str = Form("chest_xray"),
    current_user: dict = Depends(get_current_user)
):
    """Analyze an image without storing (temporary)"""
    
    # Validate image type
    valid_types = get_image_types()
    if image_type not in valid_types:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid image type. Must be one of: {', '.join(valid_types)}"
        )
    
    file_data = await file.read()
    image_base64 = base64.b64encode(file_data).decode('utf-8')
    
    result = analyze_medical_image(image_base64, image_type)
    
    if result.get("success"):
        display_name = get_image_type_display_names().get(image_type, image_type)
        return {
            "success": True,
            "image_type": image_type,
            "display_name": display_name,
            "analysis": result,
            "summary": f"🔍 {display_name} Analysis: {result['findings']}\n\n📊 Confidence: {result['confidence']*100:.1f}%\n\n💡 Recommendation: {result['recommendation']}"
        }
    else:
        raise HTTPException(status_code=500, detail=result.get("error", "Analysis failed"))

# ========== LIST FILES FROM B2 ==========

@router.get("/list/{patient_id}")
async def list_images_b2(
    patient_id: str,
    current_user: dict = Depends(get_current_user)
):
    """List images from B2 storage (without analysis)"""
    
    images = b2_storage.list_patient_images(patient_id)
    return {"images": images, "count": len(images)}

# ========== VIEW IMAGE ==========

@router.get("/view/{file_key:path}")
async def view_image(
    file_key: str,
    current_user: dict = Depends(get_current_user)
):
    """View an image from B2 storage"""
    
    try:
        image_data = b2_storage.get_image(file_key)
        return StreamingResponse(io.BytesIO(image_data), media_type="image/jpeg")
    except Exception as e:
        raise HTTPException(status_code=404, detail=str(e))

# ========== IMAGE TYPES ==========

@router.get("/types")
async def get_supported_image_types(
    current_user: dict = Depends(get_current_user)
):
    """Get all supported image types"""
    
    types = get_image_types()
    display_names = get_image_type_display_names()
    
    return {
        "success": True,
        "types": [
            {
                "key": key,
                "display_name": display_names.get(key, key)
            }
            for key in types
        ]
    }

# ========== BULK UPLOAD ==========

@router.post("/upload-bulk/{patient_id}")
async def upload_bulk_images(
    patient_id: str,
    files: List[UploadFile] = File(...),
    image_type: str = Form("chest_xray"),
    analyze: bool = Form(True),
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Upload and analyze multiple images at once"""
    
    # Validate patient
    patient = db.query(Patient).filter(Patient.id == UUID(patient_id)).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    
    # Validate image type
    valid_types = get_image_types()
    if image_type not in valid_types:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid image type. Must be one of: {', '.join(valid_types)}"
        )
    
    results = []
    errors = []
    
    for file in files:
        try:
            file_data = await file.read()
            image_base64 = base64.b64encode(file_data).decode('utf-8')
            
            # Upload to B2
            upload_result = b2_storage.upload_image(
                file_data=file_data,
                file_name=file.filename,
                patient_id=patient_id,
                content_type=file.content_type
            )
            
            if not upload_result["success"]:
                errors.append({
                    "filename": file.filename,
                    "error": upload_result.get("error", "Upload failed")
                })
                continue
            
            result_entry = {
                "filename": file.filename,
                "file_key": upload_result["file_key"],
                "public_url": upload_result["public_url"]
            }
            
            if analyze:
                analysis_result = analyze_medical_image(image_base64, image_type)
                
                if analysis_result.get("success"):
                    save_result = save_image_analysis(
                        patient_id=patient_id,
                        image_base64=image_base64,
                        image_type=image_type,
                        analysis_result=analysis_result,
                        db=db
                    )
                    
                    if save_result.get("success"):
                        result_entry["analysis"] = analysis_result
                        result_entry["image_id"] = save_result.get("image_id")
                        
                        # Save to patient history
                        analysis_entry = {
                            "id": str(upload_result["file_key"]),
                            "image_type": image_type,
                            "image_url": upload_result["public_url"],
                            "findings": analysis_result.get("findings"),
                            "confidence": analysis_result.get("confidence"),
                            "recommendation": analysis_result.get("recommendation"),
                            "analyzed_at": datetime.now().isoformat(),
                            "file_name": file.filename,
                            "image_id": save_result.get("image_id")
                        }
                        
                        current_history = patient.analysis_history or []
                        current_history.append(analysis_entry)
                        patient.analysis_history = current_history
                        db.commit()
                    else:
                        result_entry["analysis_error"] = save_result.get("error")
                else:
                    result_entry["analysis_error"] = analysis_result.get("error")
            
            results.append(result_entry)
            
        except Exception as e:
            errors.append({
                "filename": file.filename,
                "error": str(e)
            })
    
    return {
        "success": True,
        "patient_id": patient_id,
        "patient_name": patient.name,
        "image_type": image_type,
        "processed": len(results),
        "errors": len(errors),
        "results": results,
        "errors_list": errors
    }