# MediAgent V2 - AI Medical Assistant

An intelligent medical assistant that helps doctors find patients, schedule appointments, generate SOAP notes, and analyze medical images using natural language.

## Features

- Natural Language Understanding - Doctors can type naturally, AI understands intent
- Vector Search - Handles typos and semantic patient search using ChromaDB
- Multi-Agent AI - LangGraph with Planner, Executor, and Reflector agents
- SOAP Notes - Structured JSONB storage for clinical documentation
- Image Storage - Upload and manage medical images
- Caching - Redis for faster repeated searches
- Authentication - JWT-based secure access

## Tech Stack

| Layer | Technology |
|-------|------------|
| Backend | FastAPI, Python 3.11 |
| Frontend | React |
| Database | PostgreSQL (Neon) |
| Vector DB | ChromaDB |
| Cache | Redis (Upstash) |
| LLM | Groq (Llama 3.3 70B) |
| Agent Framework | LangGraph |

## Quick Start

### Backend Setup

cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload

### Frontend Setup

cd frontend
npm install
npm start

### Login Credentials

Email: doctor@mediagent.com
Password: password123

Open http://localhost:3000 to use the application.

## Architecture

User Message -> Planner Agent -> Executor Agent -> Reflector Agent -> Response

Planner decides what to do
Executor runs tools in parallel
Reflector checks success
Response formats answer

## Database Schema

- users - Doctor accounts and authentication
- patients - Patient demographics and medical history
- appointments - Scheduled appointments
- soap_notes - Clinical documentation with JSONB storage

## Environment Variables

Create a .env file with:

DATABASE_URL=postgresql://...
GROQ_API_KEY=gsk_...
REDIS_URL=rediss://...
JWT_SECRET_KEY=your_secret_key

## Future Enhancements

- RAG pipeline for medical research papers
- X-ray and MRI analysis with vision models
- Prescription generator with drug interaction checker
- Voice input support

## Author

Rajinder Kaur

## License

MIT
