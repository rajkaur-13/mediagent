from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from ..config import settings

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Simple password verification for demo"""
    return hashed_password == f"hashed_{plain_password}"

def get_password_hash(password: str) -> str:
    """Simple password hashing for demo"""
    return f"hashed_{password}"

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.JWT_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)
    return encoded_jwt

def decode_access_token(token: str) -> Optional[dict]:
    try:
        payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
        return payload
    except JWTError:
        return None
