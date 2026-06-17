from ..services.vision_service import vision_service

def analyze_medical_image(image_bytes: bytes, image_type: str = "chest_xray") -> dict:
    """Analyze medical image based on type"""
    
    image_type_map = {
        "chest_xray": vision_service.analyze_chest_xray,
        "ct_scan": vision_service.analyze_ct_scan,
        "mri": vision_service.analyze_mri,
        "ecg": vision_service.analyze_ecg,
        "retinal": vision_service.analyze_retinal
    }
    
    analyzer = image_type_map.get(image_type, vision_service.analyze_chest_xray)
    result = analyzer(image_bytes)
    
    if result.get("success"):
        return {
            "success": True,
            "analysis": result,
            "summary": f"🔍 {result['image_type'].replace('_', ' ').title()} Analysis: {result['findings']}\n\n📊 Confidence: {result['confidence']*100:.1f}%\n\n💡 Recommendation: {result['recommendation']}"
        }
    else:
        return {"success": False, "error": result.get("error", "Analysis failed")}
