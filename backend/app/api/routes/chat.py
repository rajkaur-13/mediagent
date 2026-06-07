from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, Dict
from ...db.database import get_db
from ...core.orchestrator import AgentOrchestrator
from ...api.dependencies.auth import get_current_user

router = APIRouter()

# Store orchestrator instances per user (in production, use Redis)
user_orchestrators: Dict[str, AgentOrchestrator] = {}

class ChatRequest(BaseModel):
    message: str
    session_id: Optional[str] = None
    image_base64: Optional[str] = None

class ChatResponse(BaseModel):
    reply: str
    patient: Optional[dict] = None
    tool_calls: list = []
    session_id: Optional[str] = None

@router.post("/", response_model=ChatResponse)
async def chat(
    request: ChatRequest,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    # Use user_id as the key for persistence
    user_id = str(current_user.get("id"))
    
    # Get or create orchestrator for this user
    if user_id not in user_orchestrators:
        print(f"🆕 Creating new orchestrator for user: {user_id}")
        user_orchestrators[user_id] = AgentOrchestrator(db, user_id)
    else:
        print(f"♻️ Using existing orchestrator for user: {user_id}")
        # Update db connection (in case it changed)
        user_orchestrators[user_id].db = db
    
    orchestrator = user_orchestrators[user_id]
    
    # Process message
    result = orchestrator.process_message(
        request.message,
        image_base64=request.image_base64
    )
    
    return ChatResponse(
        reply=result["reply"],
        patient=result.get("patient"),
        tool_calls=result.get("tool_calls", []),
        session_id=request.session_id
    )
