import os
from groq import Groq
from ..config import settings

# Initialize Groq client
client = Groq(api_key=settings.GROQ_API_KEY)

def get_llm_response(user_message: str, conversation_history: list = None) -> str:
    """Get response from Groq LLM"""
    try:
        messages = [
            {
                "role": "system",
                "content": """You are MediAgent, a helpful medical AI assistant for doctors. 
                Be concise, professional, and helpful. Provide clear medical information 
                but always remind that you're an AI and not a replacement for clinical judgment.
                If you don't know something, say so clearly."""
            }
        ]
        
        # Add conversation history
        if conversation_history:
            messages.extend(conversation_history[-10:])  # Last 10 messages
        
        # Add current message
        messages.append({"role": "user", "content": user_message})
        
        # Call Groq API
        completion = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=messages,
            temperature=0.7,
            max_tokens=500,
            top_p=1
        )
        
        return completion.choices[0].message.content
        
    except Exception as e:
        return f"I'm having trouble connecting to my AI service. Error: {str(e)}"

def get_structured_response(messages: list, tools: list = None) -> dict:
    """Get structured response with tool calls"""
    try:
        completion = client.chat.completions.create(
            model="llama3-70b-8192",
            messages=messages,
            temperature=0.3,
            max_tokens=1000,
            tools=tools or []
        )
        
        return {
            "content": completion.choices[0].message.content,
            "tool_calls": completion.choices[0].message.tool_calls if hasattr(completion.choices[0].message, 'tool_calls') else None
        }
        
    except Exception as e:
        return {"content": f"Error: {str(e)}", "tool_calls": None}