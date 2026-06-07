# MediAgent V2 - AI Medical Assistant

An intelligent medical assistant that helps doctors find patients, schedule appointments, generate SOAP notes, and analyze medical images using natural language.

## Features

- Natural Language Understanding
- Vector Search - Handles typos using ChromaDB
- Multi-Agent AI - LangGraph with Planner, Executor, and Reflector
- SOAP Notes - Structured JSONB storage
- Image Storage - Upload medical images
- Redis Caching - Faster repeated searches
- JWT Authentication - Secure access

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

```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload
```

### Frontend Setup

```bash
cd frontend
npm install
npm start
```

### Login Credentials

- Email: doctor@mediagent.com
- Password: password123

## Architecture

User Message -> Planner -> Executor -> Reflector -> Response

## Environment Variables

Create a .env file with:

- DATABASE_URL
- GROQ_API_KEY
- REDIS_URL
- JWT_SECRET_KEY

## Author

Rajinder Kaur

## License

MIT
