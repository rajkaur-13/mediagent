import redis
import json
from ..config import settings
import hashlib

class RedisService:
    def __init__(self):
        try:
            self.client = redis.from_url(settings.REDIS_URL, decode_responses=True)
            self.client.ping()
            print("✅ Redis connected")
        except Exception as e:
            print(f"⚠️ Redis not available: {e}")
            self.client = None
    
    def _get_key(self, prefix: str, query: str) -> str:
        """Generate cache key"""
        hash_key = hashlib.md5(query.lower().encode()).hexdigest()
        return f"{prefix}:{hash_key}"
    
    def get_patient_search(self, query: str):
        """Get cached patient search results"""
        if not self.client:
            return None
        key = self._get_key("patient_search", query)
        result = self.client.get(key)
        return json.loads(result) if result else None
    
    def set_patient_search(self, query: str, result: dict, ttl: int = 300):
        """Cache patient search results (5 minutes default)"""
        if not self.client:
            return
        key = self._get_key("patient_search", query)
        self.client.setex(key, ttl, json.dumps(result))
        print(f"✅ Cached: {query}")
    
    def get_soap_notes(self, patient_id: str):
        """Get cached SOAP notes"""
        if not self.client:
            return None
        key = f"soap_notes:{patient_id}"
        result = self.client.get(key)
        return json.loads(result) if result else None
    
    def set_soap_notes(self, patient_id: str, result: dict, ttl: int = 600):
        """Cache SOAP notes (10 minutes)"""
        if not self.client:
            return
        key = f"soap_notes:{patient_id}"
        self.client.setex(key, ttl, json.dumps(result))
    
    def clear_patient_cache(self, patient_name: str):
        """Clear cache when patient data changes"""
        if not self.client:
            return
        # Delete all patient search caches (simple approach)
        keys = self.client.keys("patient_search:*")
        if keys:
            self.client.delete(*keys)
            print(f"✅ Cleared {len(keys)} cache entries")

# Singleton instance
redis_service = RedisService()
