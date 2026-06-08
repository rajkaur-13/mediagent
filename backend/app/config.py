from pydantic_settings import BaseSettings
from typing import List, Optional
import json

class Settings(BaseSettings):
    # Database
    DATABASE_URL: str
    
    # Redis
    REDIS_URL: str = ""
    
    # Groq
    GROQ_API_KEY: str
    
    # Hugging Face
    HUGGINGFACE_API_KEY: str
    
    # JWT
    JWT_SECRET_KEY: str
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 60
    
    # App
    APP_NAME: str = "MediAgent"
    DEBUG: bool = False
    CORS_ORIGINS: str = "http://localhost:3000,http://localhost:5173"
    
    # Backblaze B2
    B2_ACCESS_KEY_ID: str = ""
    B2_SECRET_ACCESS_KEY: str = ""
    B2_ENDPOINT_URL: str = ""
    B2_BUCKET_NAME: str = "mediagent-images"
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"  # This allows extra fields in .env
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        if isinstance(self.CORS_ORIGINS, str):
            try:
                self.CORS_ORIGINS = json.loads(self.CORS_ORIGINS)
            except:
                self.CORS_ORIGINS = [origin.strip() for origin in self.CORS_ORIGINS.split(',')]

settings = Settings()
