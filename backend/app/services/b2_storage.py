import boto3
from botocore.config import Config
from ..config import settings
import uuid
from datetime import datetime

class B2Storage:
    def __init__(self):
        self.client = boto3.client(
            's3',
            endpoint_url=f"https://{settings.B2_ENDPOINT_URL}",
            aws_access_key_id=settings.B2_ACCESS_KEY_ID,
            aws_secret_access_key=settings.B2_SECRET_ACCESS_KEY,
            config=Config(signature_version='s3v4')
        )
        self.bucket = settings.B2_BUCKET_NAME
    
    def upload_image(self, file_data: bytes, file_name: str, patient_id: str, content_type: str = "image/jpeg") -> dict:
        """Upload medical image to Backblaze B2"""
        
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        file_key = f"{patient_id}/{timestamp}_{file_name}"
        
        try:
            self.client.put_object(
                Bucket=self.bucket,
                Key=file_key,
                Body=file_data,
                ContentType=content_type,
                Metadata={
                    'patient_id': patient_id,
                    'uploaded_at': timestamp,
                    'original_name': file_name
                }
            )
            
            # Generate public URL (for private bucket, this requires signed URLs)
            public_url = f"https://{self.bucket}.s3.{settings.B2_ENDPOINT_URL.replace('s3.', '')}/{file_key}"
            
            return {
                "success": True,
                "file_key": file_key,
                "public_url": public_url,
                "patient_id": patient_id,
                "uploaded_at": timestamp
            }
        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }
    
    def get_image(self, file_key: str) -> bytes:
        """Retrieve image from B2"""
        try:
            response = self.client.get_object(
                Bucket=self.bucket,
                Key=file_key
            )
            return response['Body'].read()
        except Exception as e:
            raise Exception(f"Failed to retrieve image: {str(e)}")
    
    def list_patient_images(self, patient_id: str) -> list:
        """List all images for a patient"""
        try:
            response = self.client.list_objects_v2(
                Bucket=self.bucket,
                Prefix=f"{patient_id}/"
            )
            
            images = []
            if 'Contents' in response:
                for obj in response['Contents']:
                    images.append({
                        "file_key": obj['Key'],
                        "size": obj['Size'],
                        "last_modified": obj['LastModified'].isoformat()
                    })
            
            return images
        except Exception as e:
            return []
    
    def delete_image(self, file_key: str) -> dict:
        """Delete image from B2"""
        try:
            self.client.delete_object(
                Bucket=self.bucket,
                Key=file_key
            )
            return {"success": True}
        except Exception as e:
            return {"success": False, "error": str(e)}

b2_storage = B2Storage()
