import re
from ..services.llm_service import get_llm_response

# Rule-based keywords for quick severity detection
SEVERITY_KEYWORDS = {
    "critical": [
        "chest pain", "heart attack", "stroke", "seizure", "unconscious",
        "difficulty breathing", "shortness of breath", "severe bleeding",
        "head injury", "loss of consciousness", "anaphylaxis", "suicidal"
    ],
    "high": [
        "severe pain", "high fever", "fracture", "broken bone", "infection",
        "pneumonia", "dehydration", "migraine", "blood in stool", "blood in urine"
    ],
    "medium": [
        "moderate pain", "persistent cough", "vomiting", "diarrhea",
        "rash", "ear infection", "sore throat", "urinary tract infection"
    ],
    "low": [
        "routine", "follow-up", "check-up", "vaccination", "screening",
        "annual physical", "medication refill", "lab results"
    ]
}

# Timeframe mapping
TIMEFRAME_MAP = {
    "critical": {
        "text": "IMMEDIATE - Same day",
        "days_min": 0,
        "days_max": 0,
        "priority": 1
    },
    "high": {
        "text": "URGENT - Within 24 hours",
        "days_min": 0,
        "days_max": 1,
        "priority": 2
    },
    "medium": {
        "text": "SOON - Within 48 hours",
        "days_min": 0,
        "days_max": 2,
        "priority": 3
    },
    "low": {
        "text": "ROUTINE - Within 2 weeks",
        "days_min": 1,
        "days_max": 14,
        "priority": 4
    },
    "chronic": {
        "text": "CHRONIC - Within 3 months",
        "days_min": 14,
        "days_max": 90,
        "priority": 5
    }
}

def analyze_severity(message: str) -> dict:
    """Analyze patient condition severity and recommend appointment timeframe"""
    
    message_lower = message.lower()
    
    # First, try rule-based matching (fast, free)
    severity = "low"  # default
    matched_keywords = []
    
    for level, keywords in SEVERITY_KEYWORDS.items():
        for keyword in keywords:
            if keyword in message_lower:
                severity = level
                matched_keywords.append(keyword)
                break
        if severity != "low":
            break
    
    # For complex cases or when no rule matches, use LLM
    if not matched_keywords and len(message) > 20:
        try:
            llm_prompt = f"""Analyze the following patient condition and determine appointment urgency.

Condition: "{message}"

Return ONLY JSON with these fields:
{{
    "severity": "critical|high|medium|low|chronic",
    "reason": "brief explanation",
    "recommended_timeframe": "specific recommendation"
}}

Example:
{{"severity": "high", "reason": "Chest pain requires immediate evaluation", "recommended_timeframe": "Same day"}}
"""
            response = get_llm_response(llm_prompt, [], max_tokens=150)
            # Clean response
            response = response.replace('```json', '').replace('```', '').strip()
            import json
            llm_result = json.loads(response)
            severity = llm_result.get("severity", severity)
        except:
            pass  # fall back to rule-based result
    
    timeframe = TIMEFRAME_MAP.get(severity, TIMEFRAME_MAP["low"])
    
    return {
        "severity": severity,
        "matched_keywords": matched_keywords,
        "recommendation_text": timeframe["text"],
        "days_min": timeframe["days_min"],
        "days_max": timeframe["days_max"],
        "priority": timeframe["priority"]
    }

def generate_slot_message(severity_result: dict, available_slots: list) -> str:
    """Generate user-friendly message based on severity and available slots"""
    
    severity = severity_result["severity"]
    recommendation = severity_result["recommendation_text"]
    
    if not available_slots:
        return f"""
⚠️ **AI Severity Assessment: {recommendation}**

Based on the symptoms described, this requires attention.

However, no available slots found in the recommended timeframe.

Please:
• Check for cancellations
• Consider a different doctor
• Or call the clinic directly
"""
    
    # Build slot list
    slot_lines = []
    for slot in available_slots[:5]:
        slot_lines.append(f"• {slot['date']} at {slot['time']}")
    
    slots_text = "\n".join(slot_lines)
    
    if len(available_slots) > 5:
        slots_text += f"\n• + {len(available_slots) - 5} more slots available"
    
    severity_icons = {
        "critical": "🚨 CRITICAL",
        "high": "⚠️ HIGH",
        "medium": "🟡 MEDIUM",
        "low": "✅ LOW",
        "chronic": "📋 CHRONIC"
    }
    
    return f"""
{severity_icons.get(severity, '📋')} **AI Severity Assessment: {recommendation}**

**Reason:** {severity_result.get('matched_keywords', ['Based on symptoms'])[0] if severity_result.get('matched_keywords') else 'Based on the symptoms described'}

**Available slots within recommended timeframe:**

{slots_text}

💡 Type the time you want (e.g., "Tomorrow 2 PM") or "later" to reschedule.

*This is an AI recommendation. Final clinical judgment rests with the doctor.*
"""
