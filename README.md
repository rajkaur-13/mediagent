# 🏥 MediAgent V2 — Production AI Medical Assistant

[![Live Demo](https://img.shields.io/badge/Live_Demo-mediagent--eta.vercel.app-1a73e8?style=for-the-badge&logo=vercel)](https://mediagent-eta.vercel.app)
[![Backend API](https://img.shields.io/badge/Backend_API-mediagent--pn7o.onrender.com-1a73e8?style=for-the-badge&logo=render)](https://mediagent-pn7o.onrender.com)
[![API Docs](https://img.shields.io/badge/API_Docs-Swagger-1a73e8?style=for-the-badge&logo=swagger)](https://mediagent-pn7o.onrender.com/docs)

> **An AI-powered medical assistant that helps doctors manage clinical workflows through natural language conversation. Automates administrative tasks, clinical documentation, and patient management so doctors can focus on patient care instead of paperwork.**

---

## 🎯 Why MediAgent?

Doctors spend **15+ hours per week** switching between multiple systems—EHR, scheduling, imaging, pharmacy. MediAgent eliminates this by providing a **single chat interface** where natural language requests trigger automated actions across all domains.

| Problem | Impact | MediAgent Solution |
|---------|--------|-------------------|
| 15+ hours/week on admin | Less time with patients | Natural language → automated actions |
| 5+ systems to switch between | Wasted time, frustration | Single unified chat interface |
| Manual documentation | Inefficient, error-prone | AI-powered SOAP note generation |
| Delayed image analysis | Slower diagnosis | AI analyzes X-rays in seconds |
| Complex scheduling | Double-booking, missed appointments | One-command appointment booking |

---
## 📊 System Architecture
┌─────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ │
│ USER (Doctor) │
│ │ │
│ ▼ │
│ ┌─────────────────────────────────────────────────────────────────────────────────────────────┐ │
│ │ FRONTEND (Vercel) │ │
│ │ │ │
│ │ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ │ │
│ │ │ 💬 Chat │ │ 📋 Patient │ │ 🛠️ Tools │ │ 📱 Mobile │ │ 🔐 Auth │ │ │
│ │ │ Interface │ │ Context │ │ Panel │ │ Navigation │ │ (JWT) │ │ │
│ │ └──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘ │ │
│ │ │ │
│ └─────────────────────────────────────┬───────────────────────────────────────────────────────┘ │
│ │ HTTPS/REST │
│ ▼ │
│ ┌─────────────────────────────────────────────────────────────────────────────────────────────┐ │
│ │ BACKEND (Render) │ │
│ │ │ │
│ │ ┌───────────────────────────────────────────────────────────────────────────────────────┐ │ │
│ │ │ API GATEWAY │ │ │
│ │ │ (Authentication + Rate Limiting) │ │ │
│ │ └───────────────────────────────────────────────────────────────────────────────────────┘ │ │
│ │ │ │ │
│ │ ▼ │ │
│ │ ┌───────────────────────────────────────────────────────────────────────────────────────┐ │ │
│ │ │ AGENT ORCHESTRATOR │ │ │
│ │ │ │ │ │
│ │ │ User Message → Intent Detection → Tool Selection → Tool Execution → Response │ │ │
│ │ │ │ │ │
│ │ └───────────────────────────────────────────────────────────────────────────────────────┘ │ │
│ │ │ │ │
│ │ ┌─────────────────────┼─────────────────────┐ │ │
│ │ │ │ │ │ │
│ │ ▼ ▼ ▼ │ │
│ │ ┌────────────────────────┐ ┌────────────────────────┐ ┌────────────────────────┐ │ │
│ │ │ 🛠️ TOOLS │ │ 🧠 SERVICES │ │ 🔌 EXTERNAL │ │ │
│ │ ├────────────────────────┤ ├────────────────────────┤ ├────────────────────────┤ │ │
│ │ │ • Patient Tools │ │ • Groq LLM Service │ │ • Groq API (Llama 3.3) │ │ │
│ │ │ • SOAP Tools │ │ • HuggingFace Service │ │ • HuggingFace Vision │ │ │
│ │ │ • Appointment Tools │ │ • ChromaDB Service │ │ • Pinecone (Vector DB) │ │ │
│ │ │ • Prescription Tools │ │ • Redis Service │ │ • Backblaze B2 Storage │ │ │
│ │ │ • X-Ray Tools │ └────────────────────────┘ └────────────────────────┘ │ │
│ │ │ • Similar Patients │ │ │
│ │ │ • Severity Analyzer │ │ │
│ │ └────────────────────────┘ │ │
│ │ │ │ │
│ │ ▼ │ │
│ │ ┌───────────────────────────────────────────────────────────────────────────────────────┐ │ │
│ │ │ DATA LAYER │ │ │
│ │ │ │ │ │
│ │ │ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ │ │ │
│ │ │ │ PostgreSQL │ │ ChromaDB │ │ Redis │ │ Pinecone │ │ │ │
│ │ │ │ (Neon) │ │ (Vectors) │ │ (Cache) │ │ (Vectors) │ │ │ │
│ │ │ └──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘ │ │ │
│ │ └───────────────────────────────────────────────────────────────────────────────────────┘ │ │
│ └─────────────────────────────────────────────────────────────────────────────────────────────┘ │
│ │
└─────────────────────────────────────────────────────────────────────────────────────────────────────┘

text

---

## 🔄 Data Flow: How a Request is Processed
User: "Show me patients with diabetes"
│
▼
┌───────────────────────────────────────────────────────────────────────────────────────────────────┐
│ 1. FRONTEND — React App │
│ • Captures user input │
│ • Sends POST /api/chat to backend │
└───────────────────────────────────────────────────────────────────────────────────────────────────┘
│
▼
└───────────────────────────────────────────────────────────────────────────────────────────────────┘
│ 2. BACKEND — FastAPI │
│ • Receives request via /api/chat endpoint │
│ • Validates JWT token │
│ • Passes to Orchestrator │
└───────────────────────────────────────────────────────────────────────────────────────────────────┘
│
▼
└───────────────────────────────────────────────────────────────────────────────────────────────────┘
│ 3. ORCHESTRATOR — Intent Detection │
│ • LLM (Groq Llama 3.3) analyzes message │
│ • Detects intent: "search_patient" │
│ • Extracts: condition = "diabetes" │
└───────────────────────────────────────────────────────────────────────────────────────────────────┘
│
▼
└───────────────────────────────────────────────────────────────────────────────────────────────────┘
│ 4. TOOL EXECUTION — Patient Tools │
│ • Searches ChromaDB for patients with "diabetes" │
│ • Returns: Sarah Johnson, Michael Chen │
│ • Fetches patient records from PostgreSQL │
└───────────────────────────────────────────────────────────────────────────────────────────────────┘
│
▼
└───────────────────────────────────────────────────────────────────────────────────────────────────┘
│ 5. RESPONSE GENERATION │
│ • Orchestrator formats response │
│ • Makes patient names clickable │
│ • Returns JSON to frontend │
└───────────────────────────────────────────────────────────────────────────────────────────────────┘
│
▼
└───────────────────────────────────────────────────────────────────────────────────────────────────┘
│ 6. FRONTEND — Display │
│ • Shows message in chat │
│ • Renders clickable patient names │
│ • Click → selects patient │
└───────────────────────────────────────────────────────────────────────────────────────────────────┘

text

---

## 🧠 Agent Orchestrator: The Brain

The Orchestrator uses **LangGraph** to create a multi-agent system that handles different types of requests:
┌───────────────────────────────────────────────────────────────────────────────────────────────────┐
│ USER MESSAGE │
│ "Schedule appointment for Sarah next week" │
└───────────────────────────────────────────────────────────────────────────────────────────────────┘
│
▼
┌───────────────────────────────────────────────────────────────────────────────────────────────────┐
│ LLM INTENT DETECTION │
│ Groq Llama 3.3 analyzes the message │
│ Returns: {"action": "schedule_appointment"} │
└───────────────────────────────────────────────────────────────────────────────────────────────────┘
│
▼
┌───────────────────────────────────────────────────────────────────────────────────────────────────┐
│ ┌─────────────────────────────────────────────┐ │
│ │ TOOL ROUTER │ │
│ └─────────────────────────────────────────────┘ │
│ │ │
│ ┌───────────────────────────┼───────────────────────────┐ │
│ │ │ │ │
│ ▼ ▼ ▼ │
│ ┌───────────────────┐ ┌───────────────────┐ ┌───────────────────┐ │
│ │ Patient Tools │ │ SOAP Tools │ │ Appointment Tools │ │
│ ├───────────────────┤ ├───────────────────┤ ├───────────────────┤ │
│ │ search_patient │ │ generate_soap │ │ schedule_appt │ │
│ │ get_all_patients │ │ get_soap_notes │ │ get_appointments │ │
│ │ search_by_cond │ │ get_soap_by_id │ │ get_slots │ │
│ └───────────────────┘ └───────────────────┘ └───────────────────┘ │
│ │ │ │ │
│ ├───────────────────────────┼───────────────────────────┤ │
│ │ │ │ │
│ ▼ ▼ ▼ │
│ ┌───────────────────┐ ┌───────────────────┐ ┌───────────────────┐ │
│ │ Prescription Tools │ │ X-Ray Tools │ │ Complex Query │ │
│ ├───────────────────┤ ├───────────────────┤ ├───────────────────┤ │
│ │ generate_rx │ │ analyze_xray │ │ without SOAP │ │
│ │ get_rx │ │ analyze_ct │ │ without RX │ │
│ │ get_rx_by_patient │ │ analyze_mri │ │ without appt │ │
│ │ │ │ analyze_ecg │ │ with condition │ │
│ │ │ │ analyze_retinal │ │ similar patients │ │
│ └───────────────────┘ └───────────────────┘ └───────────────────┘ │
└───────────────────────────────────────────────────────────────────────────────────────────────────┘


---

## 🗄️ Database Schema

```sql
-- Patients (Core Entity)
CREATE TABLE patients (
    id UUID PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    mrn VARCHAR(50) UNIQUE NOT NULL,
    age INTEGER,
    gender VARCHAR(10),
    phone VARCHAR(20),
    email VARCHAR(255),
    allergies TEXT[],
    conditions TEXT[],
    medications TEXT[],
    created_at TIMESTAMP DEFAULT NOW()
);

-- SOAP Notes (Clinical Documentation)
CREATE TABLE soap_notes (
    id UUID PRIMARY KEY,
    patient_id UUID REFERENCES patients(id),
    doctor_id UUID REFERENCES users(id),
    subjective TEXT,
    objective TEXT,
    assessment TEXT,
    plan TEXT,
    visit_date TIMESTAMP DEFAULT NOW()
);

-- Appointments (Scheduling)
CREATE TABLE appointments (
    id UUID PRIMARY KEY,
    patient_id UUID REFERENCES patients(id),
    doctor_id UUID REFERENCES users(id),
    date DATE NOT NULL,
    time TIME NOT NULL,
    reason TEXT,
    status VARCHAR(20) DEFAULT 'scheduled',
    created_at TIMESTAMP DEFAULT NOW()
);

-- Prescriptions (Medication Orders)
CREATE TABLE prescriptions (
    id UUID PRIMARY KEY,
    patient_id UUID REFERENCES patients(id),
    doctor_id UUID REFERENCES users(id),
    medication VARCHAR(255),
    dosage VARCHAR(50),
    frequency VARCHAR(50),
    duration VARCHAR(50),
    instructions TEXT,
    status VARCHAR(20) DEFAULT 'active',
    prescribed_date TIMESTAMP DEFAULT NOW()
);

-- Images (Medical Imaging)
CREATE TABLE images (
    id UUID PRIMARY KEY,
    patient_id UUID REFERENCES patients(id),
    image_type VARCHAR(50),  -- X-Ray, CT, MRI, ECG, Retinal
    filename VARCHAR(255),
    analysis TEXT,
    confidence FLOAT,
    uploaded_at TIMESTAMP DEFAULT NOW()
);
🚀 Features
🤖 Chat Interface
Natural language understanding

Agentic AI orchestration with LangGraph

Multi-turn conversations with context

Intent detection and tool routing

Clickable patient names in chat

🔍 Patient Management
Search by name, MRN, or condition

Fuzzy name matching for typos

Vector search with ChromaDB

Complete medical history: allergies, conditions, medications

Add new patients

📝 SOAP Notes
Generate via chat or form

AI-powered analysis and recommendations

Clinical decision support

Risk detection and alerts

Structured storage with JSONB

View latest and historical notes

Find patients without SOAP notes

💊 Prescriptions
Generate medication orders

View active prescriptions

Find patients without prescriptions

Prescription history tracking

📅 Appointments
Schedule via chat or form

Relative dates (today, tomorrow, next week)

View upcoming appointments

Find patients without appointments

🩻 Medical Imaging
5 image types: X-Ray, CT, MRI, ECG, Retinal

AI-powered analysis with HuggingFace

Confidence scoring

Upload and view images

Find patients without imaging

📊 Clinical Decision Support
SOAP note analysis

Treatment recommendations

Risk assessment

Drug interaction checking

Follow-up planning

Severity analysis

🛠️ Tech Stack
Layer	Technology	Purpose
Frontend	React 18, TypeScript	UI components, state management
Backend	FastAPI, Python 3.11	REST APIs, business logic
Database	PostgreSQL (Neon)	ACID-compliant data storage
Vector DB	ChromaDB	Semantic search, embeddings
Cache	Redis (Upstash)	Session management, rate limiting
LLM	Groq (Llama 3.3 70B)	Intent detection, responses
Vision	HuggingFace (ResNet-50)	Image analysis
Agent Framework	LangGraph	Multi-agent orchestration
Auth	JWT	Authentication and authorization
Deployment	Vercel (frontend), Render (backend)	Cloud hosting
📋 Supported Prompt Types
Category	Command	Example
Patient	Show me [name]	"Show me Sarah Johnson"
All Patients	Show all patients	"Show all patients"
By Condition	Show me patients with [condition]	"Show me patients with diabetes"
By Medication	Show me patients on [medication]	"Show me patients on Metformin"
SOAP	Generate SOAP note for [name]	"Generate SOAP note for Sarah"
Appointment	Schedule appointment for [name]	"Schedule appointment for Sarah next week"
Prescription	Write prescription for [name]	"Write prescription for Sarah"
Imaging	Show me X-rays for [name]	"Show me X-rays for Sarah"
Without	Show me patients without [item]	"Show me patients without SOAP notes"
Search	Search for [term]	"Search for hypertension"
Similar	Find similar patients to [name]	"Find similar patients to Sarah"

🔄 CI/CD Pipeline

Push to GitHub
      │
      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         GitHub Actions                                      │
│                                                                             │
│  1. Run Tests (pytest)                                                      │
│  2. Run Linting (flake8, black)                                             │
│  3. Build Application                                                       │
│  4. Deploy Backend to Render                                                │
│  5. Deploy Frontend to Vercel                                               │
│  6. Run Health Checks                                                       │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘

📁 Project Structure

mediagent-v2/
├── backend/
│   ├── app/
│   │   ├── api/                    # API endpoints
│   │   │   ├── routes/
│   │   │   │   ├── chat.py         # Main chat endpoint
│   │   │   │   ├── patients.py     # Patient CRUD
│   │   │   │   ├── appointments.py # Appointment CRUD
│   │   │   │   ├── soap.py         # SOAP note CRUD
│   │   │   │   ├── prescriptions.py# Prescription CRUD
│   │   │   │   ├── xray.py         # X-Ray analysis
│   │   │   │   ├── auth.py         # Authentication
│   │   │   │   └── images.py       # Image upload/analysis
│   │   │   └── dependencies/
│   │   │       ├── auth.py         # JWT validation
│   │   │       └── db.py           # Database session
│   │   ├── core/
│   │   │   ├── orchestrator.py     # Agent orchestration
│   │   │   ├── prompts.py          # LLM prompts
│   │   │   └── security.py         # JWT, password hashing
│   │   ├── tools/
│   │   │   ├── patient_tools.py    # Patient operations
│   │   │   ├── soap_tools.py       # SOAP note operations
│   │   │   ├── appointment_tools.py# Appointment operations
│   │   │   ├── prescription_tools.py# Prescription operations
│   │   │   ├── xray_tools.py       # X-Ray analysis
│   │   │   └── vision_tools.py     # Vision model integration
│   │   ├── models/
│   │   │   ├── patient.py          # Patient model
│   │   │   ├── soap_note.py        # SOAP note model
│   │   │   ├── appointment.py      # Appointment model
│   │   │   ├── prescription.py     # Prescription model
│   │   │   ├── image.py            # Image model
│   │   │   └── user.py             # User model
│   │   ├── services/
│   │   │   ├── llm_service.py      # Groq LLM integration
│   │   │   ├── vision_service.py   # HuggingFace integration
│   │   │   ├── chroma_service.py   # Vector search
│   │   │   └── redis_service.py    # Caching
│   │   └── db/
│   │       └── database.py         # Database connection
│   ├── requirements.txt
│   ├── .env.example
│   └── render.yaml
│
├── frontend/
│   ├── src/
│   │   ├── App.js                  # Main React component
│   │   ├── components/
│   │   │   ├── XRayAnalyzer.js     # Image upload/analysis
│   │   │   ├── AnalyzeButton.js    # Patient analysis
│   │   │   └── ...                 # Other components
│   │   ├── App.css                 # Styling
│   │   └── index.js                # Entry point
│   ├── package.json
│   └── vercel.json
│
├── .github/
│   └── workflows/
│       └── deploy.yml              # CI/CD pipeline
│
├── docker-compose.yml
├── README.md
└── render.yaml


🏁 Quick Start

Backend Setup

cd backend
conda create -n mediagent python=3.11
conda activate mediagent
pip install -r requirements.txt
cp .env.example .env
# Fill in your API keys
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

Frontend Setup

cd frontend
npm install
npm start

