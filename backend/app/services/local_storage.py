import os
import shutil
from pathlib import Path
from datetime import datetime
import uuid

# Base directory for uploads
UPLOAD_DIR = Path("uploads/images")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

class LocalStorage:
    def upload_image(self, file_data: bytes, file_name: str, patient_id: str) -> dict:
        """Save image to local storage"""
        
        # Create patient directory if not exists
        patient_dir = UPLOAD_DIR / patient_id
        patient_dir.mkdir(parents=True, exist_ok=True)
        
        # Generate unique filename
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        safe_name = f"{timestamp}_{file_name.replace(' ', '_')}"
        file_path = patient_dir / safe_name
        
        # Save file
        with open(file_path, "wb") as f:
            f.write(file_data)
        
        return {
            "success": True,
            "file_path": str(file_path),
            "patient_id": patient_id,
            "file_name": safe_name,
            "uploaded_at": timestamp
        }
    
    def get_image(self, patient_id: str, file_name: str) -> bytes:
        """Retrieve image from local storage"""
        file_path = UPLOAD_DIR / patient_id / file_name
        if not file_path.exists():
            raise Exception("Image not found")
        
        with open(file_path, "rb") as f:
            return f.read()
    
    def list_patient_images(self, patient_id: str) -> list:
        """List all images for a patient"""
        patient_dir = UPLOAD_DIR / patient_id
        if not patient_dir.exists():
            return []
        
        images = []
        for file_path in patient_dir.iterdir():
            if file_path.is_file():
                stat = file_path.stat()
                images.append({
                    "file_name": file_path.name,
                    "size": stat.st_size,
                    "last_modified": datetime.fromtimestamp(stat.st_mtime).isoformat()
                })
        return images
    
    def delete_image(self, patient_id: str, file_name: str) -> dict:
        """Delete image"""
        file_path = UPLOAD_DIR / patient_id / file_name
        if file_path.exists():
            file_path.unlink()
            return {"success": True}
        return {"success": False, "error": "File not found"}

# Singleton instance
local_storage = LocalStorage()
