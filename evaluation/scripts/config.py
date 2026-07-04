import os
from dotenv import load_dotenv
from pathlib import Path

env_path = Path(__file__).parent.parent / '.env'
load_dotenv(dotenv_path=env_path)

class Config:
    GROK_API_KEY = os.getenv("GROK_API_KEY")
    
    EVALUATION_MODEL = "llama-3.3-70b-versatile"
    
    DATA_PATH = "data/test_dataset.json"
    RESULTS_PATH = "evaluation/results/"