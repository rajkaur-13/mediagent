from fastapi import APIRouter, Depends, File, UploadFile, HTTPException
from sqlalchemy.orm import Session
from fastapi.responses import FileResponse
from ...db.database import get_db
from ...api.dependencies.auth import get_current_user
from ...services.local_storage import local_storage
import os

router = APIRouter()

@router.post("/upload/{patient_id}")
async def upload_image(
    patient_id: str,
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    """Upload a medical image for a patient"""
    
    # Validate file type
    allowed_types = ["image/jpeg", "image/png", "image/jpg"]
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail=f"File type {file.content_type} not allowed")
    
    # Read file
    file_data = await file.read()
    
    # Save locally
    result = local_storage.upload_image(
        file_data=file_data,
        file_name=file.filename,
        patient_id=patient_id
    )
    
    return {
        "message": "Image uploaded successfully",
        "patient_id": patient_id,
        "file_name": result["file_name"],
        "uploaded_at": result["uploaded_at"]
    }

@router.get("/list/{patient_id}")
async def list_images(
    patient_id: str,
    current_user: dict = Depends(get_current_user)
):
    """List all images for a patient"""
    images = local_storage.list_patient_images(patient_id)
    return {"images": images, "count": len(images)}

@router.get("/view/{patient_id}/{file_name}")
async def view_image(
    patient_id: str,
    file_name: str,
    current_user: dict = Depends(get_current_user)
):
    """View an image"""
    from fastapi.responses import FileResponse
    import os
    
    file_path = f"uploads/images/{patient_id}/{file_name}"
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Image not found")
    
    return FileResponse(file_path)
