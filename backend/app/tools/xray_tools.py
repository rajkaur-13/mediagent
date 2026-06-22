import base64
import io
from PIL import Image
import numpy as np
from datetime import datetime
from typing import Optional, Dict, Any, List
from sqlalchemy.orm import Session
from ..models.image import Image
from ..models.patient import Patient
from ..services.vision_service import vision_service

def analyze_medical_image(image_base64: str, image_type: str = "chest_xray") -> dict:
    """
    Analyze medical image based on type.
    Supports: chest_xray, ct_scan, mri, ecg, retinal
    """
    try:
        # Decode base64 image
        if "," in image_base64:
            image_base64 = image_base64.split(",")[1]
        
        image_data = base64.b64decode(image_base64)
        
        # Use vision_service for analysis
        image_type_map = {
            "chest_xray": vision_service.analyze_chest_xray,
            "ct_scan": vision_service.analyze_ct_scan,
            "mri": vision_service.analyze_mri,
            "ecg": vision_service.analyze_ecg,
            "retinal": vision_service.analyze_retinal
        }
        
        analyzer = image_type_map.get(image_type, vision_service.analyze_chest_xray)
        result = analyzer(image_data)
        
        if result.get("success"):
            return {
                "success": True,
                "image_type": image_type,
                "findings": result.get("findings", "No findings"),
                "confidence": result.get("confidence", 0.0),
                "recommendation": result.get("recommendation", "Clinical correlation recommended"),
                "image_size": result.get("image_size", "Unknown")
            }
        else:
            return {
                "success": False,
                "error": result.get("error", "Analysis failed")
            }
        
    except Exception as e:
        return {
            "success": False,
            "error": f"Failed to analyze image: {str(e)}"
        }

def save_image_analysis(
    patient_id: str,
    image_base64: str,
    image_type: str,
    analysis_result: dict,
    db: Session
) -> Dict[str, Any]:
    """
    Save image analysis to database
    """
    try:
        # Decode image for storage (optional - store as base64 or save to cloud)
        if "," in image_base64:
            image_base64 = image_base64.split(",")[1]
        
        # Create image record
        new_image = Image(
            patient_id=patient_id,
            image_type=image_type,
            filename=f"{patient_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.jpg",
            image_data=image_base64,  # Store base64 or upload to cloud
            analysis=analysis_result.get("findings", ""),
            confidence=analysis_result.get("confidence", 0.0),
            uploaded_at=datetime.now()
        )
        
        db.add(new_image)
        db.commit()
        db.refresh(new_image)
        
        return {
            "success": True,
            "image_id": str(new_image.id),
            "message": f"{image_type.replace('_', ' ').title()} analysis saved successfully"
        }
        
    except Exception as e:
        db.rollback()
        return {
            "success": False,
            "error": f"Failed to save image: {str(e)}"
        }

def get_patient_images(
    patient_id: str,
    image_type: Optional[str] = None,
    db: Session = None
) -> List[Dict[str, Any]]:
    """
    Get all images for a patient, optionally filtered by type
    """
    try:
        query = db.query(Image).filter(Image.patient_id == patient_id)
        
        if image_type:
            query = query.filter(Image.image_type == image_type)
        
        images = query.order_by(Image.uploaded_at.desc()).all()
        
        result = []
        for img in images:
            result.append({
                "id": str(img.id),
                "image_type": img.image_type,
                "filename": img.filename,
                "analysis": img.analysis,
                "confidence": img.confidence,
                "uploaded_at": img.uploaded_at.strftime("%Y-%m-%d %H:%M") if img.uploaded_at else "Unknown"
            })
        
        return result
        
    except Exception as e:
        return []

def get_images_by_type(
    image_type: str,
    db: Session,
    patient_name: Optional[str] = None
) -> List[Dict[str, Any]]:
    """
    Get all images of a specific type, optionally filtered by patient name
    """
    try:
        query = db.query(Image).filter(Image.image_type == image_type)
        
        if patient_name:
            patients = db.query(Patient).filter(Patient.name.ilike(f"%{patient_name}%")).all()
            if patients:
                patient_ids = [p.id for p in patients]
                query = query.filter(Image.patient_id.in_(patient_ids))
            else:
                return []
        
        images = query.order_by(Image.uploaded_at.desc()).all()
        
        result = []
        for img in images:
            patient = db.query(Patient).filter(Patient.id == img.patient_id).first()
            result.append({
                "id": str(img.id),
                "patient_name": patient.name if patient else "Unknown",
                "patient_id": str(img.patient_id),
                "image_type": img.image_type,
                "filename": img.filename,
                "analysis": img.analysis,
                "confidence": img.confidence,
                "uploaded_at": img.uploaded_at.strftime("%Y-%m-%d %H:%M") if img.uploaded_at else "Unknown"
            })
        
        return result
        
    except Exception as e:
        return []

def delete_image(image_id: str, db: Session) -> Dict[str, Any]:
    """
    Delete an image record
    """
    try:
        from uuid import UUID
        image = db.query(Image).filter(Image.id == UUID(image_id)).first()
        
        if not image:
            return {"success": False, "error": "Image not found"}
        
        db.delete(image)
        db.commit()
        
        return {"success": True, "message": "Image deleted successfully"}
        
    except Exception as e:
        db.rollback()
        return {"success": False, "error": f"Failed to delete image: {str(e)}"}

# ========== FOR BACKWARD COMPATIBILITY ==========

def analyze_xray(image_base64: str) -> dict:
    """
    Legacy function for X-Ray analysis
    """
    return analyze_medical_image(image_base64, "chest_xray")

def analyze_ct_scan(image_base64: str) -> dict:
    """
    Analyze CT Scan image
    """
    return analyze_medical_image(image_base64, "ct_scan")

def analyze_mri(image_base64: str) -> dict:
    """
    Analyze MRI image
    """
    return analyze_medical_image(image_base64, "mri")

def analyze_ecg(image_base64: str) -> dict:
    """
    Analyze ECG image
    """
    return analyze_medical_image(image_base64, "ecg")

def analyze_retinal(image_base64: str) -> dict:
    """
    Analyze Retinal Scan image
    """
    return analyze_medical_image(image_base64, "retinal")

def get_image_types() -> List[str]:
    """
    Get list of supported image types
    """
    return ["chest_xray", "ct_scan", "mri", "ecg", "retinal"]

def get_image_type_display_names() -> Dict[str, str]:
    """
    Get display names for image types
    """
    return {
        "chest_xray": "Chest X-Ray",
        "ct_scan": "CT Scan",
        "mri": "MRI Scan",
        "ecg": "ECG",
        "retinal": "Retinal Scan"
    }