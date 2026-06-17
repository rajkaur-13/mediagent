from sqlalchemy import Column, String, Integer, Date, DateTime, ARRAY, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
import uuid
from ..db.database import Base

class Patient(Base):
    __tablename__ = "patients"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    mrn = Column(String(50), unique=True, nullable=False)
    name = Column(String(255), nullable=False)
    age = Column(Integer)
    dob = Column(Date)
    gender = Column(String(10))
    phone = Column(String(20))
    email = Column(String(255))
    allergies = Column(ARRAY(String), default=[])
    conditions = Column(ARRAY(String), default=[])
    medications = Column(ARRAY(String), default=[])
    analysis_history = Column(JSON, default=[])  # NEW: Store X-ray/analysis results
    created_at = Column(DateTime(timezone=True), server_default=func.now())
