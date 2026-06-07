import chromadb
from sentence_transformers import SentenceTransformer
import uuid

class ChromaService:
    def __init__(self):
        self.client = chromadb.PersistentClient(path="./chroma_db")
        self.collection_name = "mediagent_patients"
        
        # Get existing collection
        try:
            self.collection = self.client.get_collection(self.collection_name)
            print("✅ ChromaDB connected to existing collection")
        except:
            self.collection = self.client.create_collection(
                name=self.collection_name,
                metadata={"hnsw:space": "cosine"}
            )
            print("✅ ChromaDB created new collection")
        
        self.model = SentenceTransformer('all-MiniLM-L6-v2')
    
    def create_embedding(self, text: str) -> list:
        return self.model.encode(text).tolist()
    
    def upsert_patient(self, patient_id: str, name: str, conditions: list = None):
        text = f"{name} {', '.join(conditions) if conditions else ''}"
        vector = self.create_embedding(text)
        
        self.collection.upsert(
            ids=[patient_id],
            embeddings=[vector],
            metadatas=[{"name": name, "conditions": str(conditions) if conditions else ""}]
        )
        print(f"✅ Stored: {name}")
        return {"success": True}
    
    def search_patients(self, query: str, top_k: int = 5) -> list:
        query_vector = self.create_embedding(query)
        
        results = self.collection.query(
            query_embeddings=[query_vector],
            n_results=top_k,
            include=["metadatas", "distances"]
        )
        
        patients = []
        if results['ids'] and results['ids'][0]:
            for i, patient_id in enumerate(results['ids'][0]):
                distance = results['distances'][0][i] if results['distances'] else 0
                similarity = 1 - distance
                
                patients.append({
                    "patient_id": patient_id,
                    "score": similarity,
                    "name": results['metadatas'][0][i].get("name", "Unknown"),
                    "similarity": f"{similarity * 100:.1f}%"
                })
        
        return patients

chroma_service = ChromaService()
