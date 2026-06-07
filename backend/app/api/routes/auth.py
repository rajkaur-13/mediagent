from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from datetime import timedelta
from ...db.database import get_db
from ...models.user import User
from ...core.security import verify_password, create_access_token, get_password_hash

router = APIRouter()

class LoginRequest(BaseModel):
    email: str
    password: str

class LoginResponse(BaseModel):
    token: str
    user: dict

@router.post("/login", response_model=LoginResponse)
async def login(request: LoginRequest, db: Session = Depends(get_db)):
    """Authenticate user and return JWT token"""
    
    # Find user
    user = db.query(User).filter(User.email == request.email).first()
    
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # Verify password
    if not verify_password(request.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # Create token
    token = create_access_token(data={"sub": user.email, "id": str(user.id), "role": user.role})
    
    return LoginResponse(
        token=token,
        user={
            "id": str(user.id),
            "email": user.email,
            "full_name": user.full_name,
            "role": user.role
        }
    )

@router.post("/register")
async def register(email: str, password: str, full_name: str, db: Session = Depends(get_db)):
    """Register a new user"""
    
    # Check if user exists
    existing = db.query(User).filter(User.email == email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create user
    user = User(
        email=email,
        hashed_password=get_password_hash(password),
        full_name=full_name,
        role="doctor"
    )
    
    db.add(user)
    db.commit()
    
    return {"message": "User created successfully", "user_id": str(user.id)}