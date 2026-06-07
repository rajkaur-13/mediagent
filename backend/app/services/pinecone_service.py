import pinecone
from sentence_transformers import SentenceTransformer
from ..config import settings
import uuid

class PineconeService:
    def __init__(self):
        # Initialize Pinecone
        pinecone.init(
            api_key=settings.PINECONE_API_KEY,
            environment=settings.PINECONE_ENVIRONMENT
        )
        
        # Create index if not exists
        self.index_name = settings.PINECONE_INDEX
        if self.index_name not in pinecone.list_indexes():
            pinecone.create_index(
                name=self.index_name,
                dimension=384,  # For all-MiniLM-L6-v2
                metric='cosine'
            )
        
        self.index = pinecone.Index(self.index_name)
        
        # Embedding model
        self.model = SentenceTransformer('all-MiniLM-L6-v2')
    
    def create_embedding(self, text: str) -> list:
        """Convert text to vector embedding"""
        return self.model.encode(text).tolist()
    
    def upsert_patient(self, patient_id: str, name: str, conditions: list = None):
        """Store patient in Pinecone for search"""
        
        # Create text to embed
        text = f"{name} {', '.join(conditions) if conditions else ''}"
        
        # Create embedding
        vector = self.create_embedding(text)
        
        # Store in Pinecone
        self.index.upsert(
            vectors=[(patient_id, vector, {"name": name, "conditions": conditions})]
        )
        return {"success": True, "patient_id": patient_id}
    
    def search_patients(self, query: str, top_k: int = 5) -> list:
        """Search for patients similar to query (handles typos)"""
        
        # Convert query to vector
        query_vector = self.create_embedding(query)
        
        # Search Pinecone
        results = self.index.query(
            vector=query_vector,
            top_k=top_k,
            include_metadata=True
        )
        
        return [
            {
                "patient_id": match.id,
                "score": match.score,
                "name": match.metadata.get("name", "Unknown"),
                "similarity": f"{match.score * 100:.1f}%"
            }
            for match in results.matches
        ]
    
    def delete_patient(self, patient_id: str):
        """Remove patient from Pinecone"""
        self.index.delete(ids=[patient_id])
        return {"success": True}

# Singleton instance
pinecone_service = PineconeService()
