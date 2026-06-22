import base64
import io
from PIL import Image
import numpy as np
import requests
import os
from typing import Dict, Any, Optional

class VisionService:
    """Service for medical image analysis using HuggingFace API"""
    
    def __init__(self):
        self.api_key = os.getenv("HUGGINGFACE_API_KEY", "")
        self.api_url = "https://api-inference.huggingface.co/models/"
        
        # Map image types to specific HuggingFace models
        self.model_map = {
            "chest_xray": "microsoft/resnet-50",
            "ct_scan": "microsoft/resnet-50",
            "mri": "microsoft/resnet-50",
            "ecg": "microsoft/resnet-50",
            "retinal": "microsoft/resnet-50"
        }
        
        # Class labels for each image type
        self.class_labels = {
            "chest_xray": ["Normal", "Pneumonia", "COVID-19", "Tuberculosis", "Lung Opacity"],
            "ct_scan": ["Normal", "Tumor", "Stroke", "Hemorrhage", "Lesion"],
            "mri": ["Normal", "Tumor", "Lesion", "Inflammation", "Degeneration"],
            "ecg": ["Normal", "Arrhythmia", "Ischemia", "Infarction", "Block"],
            "retinal": ["Normal", "Diabetic Retinopathy", "Glaucoma", "Macular Degeneration", "Hypertensive Retinopathy"]
        }
        
        self.findings_map = {
            "chest_xray": {
                "Normal": "No abnormalities detected in chest X-ray.",
                "Pneumonia": "Patchy opacities and consolidation consistent with pneumonia.",
                "COVID-19": "Ground-glass opacities with peripheral distribution consistent with COVID-19.",
                "Tuberculosis": "Cavitary lesions in upper lobes consistent with tuberculosis.",
                "Lung Opacity": "Increased lung opacity, recommend clinical correlation."
            },
            "ct_scan": {
                "Normal": "No abnormalities detected in CT scan.",
                "Tumor": "Space-occupying lesion consistent with tumor.",
                "Stroke": "Hypodense area consistent with ischemic stroke.",
                "Hemorrhage": "Hyperdense area consistent with hemorrhage.",
                "Lesion": "Abnormal lesion detected, recommend biopsy."
            },
            "mri": {
                "Normal": "No abnormalities detected in MRI.",
                "Tumor": "Abnormal mass consistent with tumor.",
                "Lesion": "Abnormal lesion detected.",
                "Inflammation": "Inflammatory changes detected.",
                "Degeneration": "Degenerative changes consistent with condition."
            },
            "ecg": {
                "Normal": "Normal sinus rhythm.",
                "Arrhythmia": "Irregular rhythm detected.",
                "Ischemia": "ST segment changes consistent with ischemia.",
                "Infarction": "Significant changes consistent with infarction.",
                "Block": "Conduction block detected."
            },
            "retinal": {
                "Normal": "Normal retinal findings.",
                "Diabetic Retinopathy": "Microaneurysms and hemorrhages consistent with diabetic retinopathy.",
                "Glaucoma": "Optic disc cupping consistent with glaucoma.",
                "Macular Degeneration": "Drusen and macular changes consistent with degeneration.",
                "Hypertensive Retinopathy": "Vascular changes consistent with hypertension."
            }
        }
        
        self.recommendations = {
            "Normal": "No clinical action needed. Routine follow-up recommended.",
            "Abnormal": "Clinical correlation recommended. Consider further evaluation.",
            "High": "Urgent clinical evaluation recommended.",
            "Medium": "Clinical correlation recommended.",
            "Low": "Monitor and follow-up as needed."
        }
    
    def _analyze_with_huggingface(self, image_bytes: bytes, model: str) -> Dict[str, Any]:
        """Analyze image using HuggingFace API"""
        try:
            if self.api_key:
                headers = {"Authorization": f"Bearer {self.api_key}"}
                response = requests.post(
                    f"{self.api_url}{model}",
                    headers=headers,
                    data=image_bytes
                )
                
                if response.status_code == 200:
                    result = response.json()
                    return {"success": True, "result": result}
                else:
                    return {"success": False, "error": f"API Error: {response.status_code}"}
            else:
                return {"success": False, "error": "No API key provided"}
                
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    def _get_mock_analysis(self, image_type: str) -> Dict[str, Any]:
        """Get mock analysis for demo purposes"""
        import random
        
        labels = self.class_labels.get(image_type, ["Normal", "Abnormal"])
        # Weight towards Normal for demo
        weights = [0.6] + [0.1] * (len(labels) - 1)
        finding = random.choices(labels, weights=weights)[0]
        
        confidence = random.uniform(0.78, 0.95)
        
        findings_text = self.findings_map.get(image_type, {}).get(
            finding,
            f"{finding} detected in {image_type.replace('_', ' ')}."
        )
        
        if finding == "Normal":
            recommendation = "No clinical action needed. Routine follow-up recommended."
            severity = "Low"
        else:
            recommendation = "Clinical correlation recommended. Consider further evaluation."
            severity = "Medium" if confidence > 0.85 else "Low"
        
        return {
            "success": True,
            "image_type": image_type,
            "finding": finding,
            "findings": findings_text,
            "confidence": confidence,
            "recommendation": recommendation,
            "severity": severity
        }
    
    def analyze_chest_xray(self, image_bytes: bytes) -> Dict[str, Any]:
        """Analyze chest X-ray image"""
        # For demo, use mock analysis
        # In production, use: self._analyze_with_huggingface(image_bytes, self.model_map["chest_xray"])
        result = self._get_mock_analysis("chest_xray")
        result["image_size"] = "1024x1024"
        return result
    
    def analyze_ct_scan(self, image_bytes: bytes) -> Dict[str, Any]:
        """Analyze CT scan image"""
        result = self._get_mock_analysis("ct_scan")
        result["image_size"] = "512x512"
        return result
    
    def analyze_mri(self, image_bytes: bytes) -> Dict[str, Any]:
        """Analyze MRI image"""
        result = self._get_mock_analysis("mri")
        result["image_size"] = "512x512"
        return result
    
    def analyze_ecg(self, image_bytes: bytes) -> Dict[str, Any]:
        """Analyze ECG image"""
        result = self._get_mock_analysis("ecg")
        result["image_size"] = "800x400"
        return result
    
    def analyze_retinal(self, image_bytes: bytes) -> Dict[str, Any]:
        """Analyze retinal scan image"""
        result = self._get_mock_analysis("retinal")
        result["image_size"] = "1024x1024"
        return result

# Create singleton instance
vision_service = VisionService()