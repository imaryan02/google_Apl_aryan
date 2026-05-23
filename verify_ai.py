import sys
import os

# Setup path to backend folder to import app modules
backend_path = os.path.join(os.path.dirname(__file__), 'backend')
sys.path.append(backend_path)

from dotenv import load_dotenv
load_dotenv(os.path.join(backend_path, '.env'))

from app.core.ai import generate_ai_recommendation, GeminiRecommendationSchema

def run_ai_verification():
    print("=== STARTING GOOGLE GENAI AGENT LAYER VERIFICATION ===")
    
    # Mock parameters representing a congested Zone A
    alert_type = "congestion"
    severity = "high"
    title = "Gate A Entrance Overcrowding Warning"
    description = "Crowd density has reached 75.0% in Gate A Entrance. Egress flow speed is slow."
    zone_code = "ZONE_A"
    zone_name = "Gate A Entrance"
    density = 75.0
    speed = "slow"
    warning_threshold = 60.0
    critical_threshold = 80.0
    
    routes_info = [
        {"name": "R-01", "type": "public", "status": "open", "priority": 1, "is_emergency": False},
        {"name": "R-02", "type": "public", "status": "restricted", "priority": 1, "is_emergency": False},
        {"name": "E-01", "type": "emergency", "status": "blocked", "priority": 5, "is_emergency": True}
    ]
    
    print("[1/2] Invoking generate_ai_recommendation...")
    recommendation_obj = generate_ai_recommendation(
        alert_type=alert_type,
        severity=severity,
        title=title,
        description=description,
        zone_code=zone_code,
        zone_name=zone_name,
        density=density,
        speed=speed,
        warning_threshold=warning_threshold,
        critical_threshold=critical_threshold,
        routes_info=routes_info
    )
    
    # 2. Assertions
    print("\n[2/2] Validating response schema compliance...")
    assert isinstance(recommendation_obj, GeminiRecommendationSchema), "Result must be an instance of GeminiRecommendationSchema"
    assert len(recommendation_obj.recommendation) > 0, "Recommendation must not be empty"
    assert len(recommendation_obj.reasoning) > 0, "Reasoning must not be empty"
    assert len(recommendation_obj.suggested_actions) > 0, "Suggested actions checklist must not be empty"
    
    print("\n=== GOOGLE GENAI RECOMMENDATION OBJECT DETAILS ===")
    print(f"Recommendation: '{recommendation_obj.recommendation}'")
    print(f"Reasoning:      '{recommendation_obj.reasoning}'")
    print(f"Checklist Actions:")
    for action in recommendation_obj.suggested_actions:
        print(f"  - {action}")
        
    print("\n=== VERIFICATION SUCCESSFUL: GOOGLE GENAI AGENT LAYER IS VALID AND OPERATIONAL ===")

if __name__ == "__main__":
    run_ai_verification()
