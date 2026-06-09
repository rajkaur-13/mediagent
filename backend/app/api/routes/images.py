from fastapi import APIRouter, Depends, File, UploadFile, HTTPException, Form
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import Optional
from uuid import UUID
from datetime import datetime
from ...db.database import get_db
from ...api.dependencies.auth import get_current_user
from ...services.b2_storage import b2_storage
from ...services.vision_service import vision_service
from ...models.patient import Patient
import io
import json

router = APIRouter()

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
    
    allowed_types = ["image/jpeg", "image/png", "image/jpg"]
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail=f"File type {file.content_type} not allowed")
    
    # Get patient
    patient = db.query(Patient).filter(Patient.id == UUID(patient_id)).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    
    file_data = await file.read()
    
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
        "patient_id": patient_id
    }
    
    # Analyze image and save to patient history
    if analyze:
        # Get analysis based on image type
        image_type_map = {
            "chest_xray": vision_service.analyze_chest_xray,
            "ct_scan": vision_service.analyze_ct_scan,
            "mri": vision_service.analyze_mri,
            "ecg": vision_service.analyze_ecg,
            "retinal": vision_service.analyze_retinal
        }
        
        analyzer = image_type_map.get(image_type, vision_service.analyze_chest_xray)
        analysis = analyzer(file_data)
        
        if analysis.get("success"):
            # Save analysis to patient's history
            analysis_entry = {
                "id": str(result["file_key"]),
                "image_type": image_type,
                "image_url": result["public_url"],
                "findings": analysis.get("findings"),
                "confidence": analysis.get("confidence"),
                "recommendation": analysis.get("recommendation"),
                "analyzed_at": datetime.now().isoformat(),
                "file_name": file.filename
            }
            
            current_history = patient.analysis_history or []
            current_history.append(analysis_entry)
            patient.analysis_history = current_history
            db.commit()
            
            response["analysis"] = analysis
            response["analysis_saved"] = True
        else:
            response["analysis_error"] = analysis.get("error")
    
    return response

@router.get("/analysis/{patient_id}")
async def get_patient_analysis(
    patient_id: str,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all image analysis results for a patient"""
    
    patient = db.query(Patient).filter(Patient.id == UUID(patient_id)).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    
    return {
        "patient_id": patient_id,
        "patient_name": patient.name,
        "analyses": patient.analysis_history or [],
        "count": len(patient.analysis_history or [])
    }

@router.post("/analyze")
async def analyze_uploaded_image(
    file: UploadFile = File(...),
    image_type: str = Form("chest_xray"),
    current_user: dict = Depends(get_current_user)
):
    """Analyze an image without storing (temporary)"""
    
    file_data = await file.read()
    
    image_type_map = {
        "chest_xray": vision_service.analyze_chest_xray,
        "ct_scan": vision_service.analyze_ct_scan,
        "mri": vision_service.analyze_mri,
        "ecg": vision_service.analyze_ecg,
        "retinal": vision_service.analyze_retinal
    }
    
    analyzer = image_type_map.get(image_type, vision_service.analyze_chest_xray)
    result = analyzer(file_data)
    
    if result.get("success"):
        return {
            "success": True,
            "image_type": image_type,
            "analysis": result,
            "summary": f"🔍 {result['image_type'].replace('_', ' ').title()} Analysis: {result['findings']}\n\n📊 Confidence: {result['confidence']*100:.1f}%\n\n💡 Recommendation: {result['recommendation']}"
        }
    else:
        raise HTTPException(status_code=500, detail=result.get("error", "Analysis failed"))

@router.get("/list/{patient_id}")
async def list_images(
    patient_id: str,
    current_user: dict = Depends(get_current_user)
):
    images = b2_storage.list_patient_images(patient_id)
    return {"images": images, "count": len(images)}

@router.get("/view/{file_key:path}")
async def view_image(
    file_key: str,
    current_user: dict = Depends(get_current_user)
):
    try:
        image_data = b2_storage.get_image(file_key)
        return StreamingResponse(io.BytesIO(image_data), media_type="image/jpeg")
    except Exception as e:
        raise HTTPException(status_code=404, detail=str(e))
