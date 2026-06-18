from app.db.database import engine
from sqlalchemy import text

with engine.connect() as conn:
    # Add analysis_history column (JSONB) to store image analysis results
    conn.execute(text("""
        ALTER TABLE patients 
        ADD COLUMN IF NOT EXISTS analysis_history JSONB DEFAULT '[]'::jsonb
    """))
    conn.commit()
    print('✅ Added analysis_history column to patients table')
