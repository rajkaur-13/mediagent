from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .config import settings
from .api.routes import chat, patients, appointments, soap, xray, auth, images, prescriptions, analyze
from .db.database import engine, Base

# Create tables on startup
print("📊 Creating database tables...")
Base.metadata.create_all(bind=engine)
print("✅ Database tables ready")

app = FastAPI(title=settings.APP_NAME, debug=settings.DEBUG)



# Configure CORS - Allow Vercel frontend and local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://mediagent-eta.vercel.app",
        "https://mediagent-imu56pqz8-mediagent1.vercel.app",  # Add this new URL
        "https://mediagent-git-main-mediagent1.vercel.app",
        "https://mediagent-4sf26hsh7-mediagent1.vercel.app",
        "http://localhost:3000",
        "http://localhost:8000",
        "https://mediagent-pn7o.onrender.com"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routes
app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(chat.router, prefix="/api/chat", tags=["chat"])
app.include_router(patients.router, prefix="/api/patients", tags=["patients"])
app.include_router(appointments.router, prefix="/api/appointments", tags=["appointments"])
app.include_router(soap.router, prefix="/api/soap", tags=["soap"])
app.include_router(xray.router, prefix="/api/xray", tags=["xray"])
app.include_router(images.router, prefix="/api/images", tags=["images"])
app.include_router(prescriptions.router, prefix="/api/prescriptions", tags=["prescriptions"])
app.include_router(analyze.router, prefix="/api/analyze", tags=["analyze"])

@app.get("/")
async def root():
    return {"message": "MediAgent API is running", "version": "2.0.0"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

@app.on_event("startup")
async def startup_event():
    print("🚀 MediAgent API starting...")
    print(f"📊 Database: {settings.DATABASE_URL[:50]}...")

