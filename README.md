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



## 📊 System Architecture
