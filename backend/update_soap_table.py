from app.db.database import engine
from sqlalchemy import text

# Add JSONB column if not exists
with engine.connect() as conn:
    try:
        conn.execute(text("ALTER TABLE soap_notes ADD COLUMN content JSONB DEFAULT '{}'::jsonb"))
        print("✅ Added content column (JSONB)")
    except Exception as e:
        if "already exists" in str(e):
            print("⚠️ Column already exists")
        else:
            print(f"Error: {e}")
    
    conn.commit()
print("✅ SOAP notes table ready for JSONB")
