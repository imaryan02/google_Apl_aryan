import os
import logging
from typing import List, Optional
from pydantic import BaseModel
from google import genai
from google.genai import types

logger = logging.getLogger("AiAgentSubsystem")

class GeminiRecommendationSchema(BaseModel):
    recommendation: str
    reasoning: str
    suggested_actions: List[str]

# Initialize the Gemini GenAI Client
# NOTE: The SDK automatically looks up GEMINI_API_KEY from the environment
api_key = os.getenv("GEMINI_API_KEY")
client = None

if api_key:
    try:
        client = genai.Client()
        logger.info("Google GenAI SDK client initialized successfully.")
    except Exception as e:
        logger.error(f"Failed to initialize Google GenAI Client: {e}")
else:
    logger.warning("GEMINI_API_KEY not found in environment. GenAI SDK will operate in fallback heuristic mode.")

def generate_ai_recommendation(
    alert_type: str,
    severity: str,
    title: str,
    description: str,
    zone_code: str,
    zone_name: str,
    density: float,
    speed: str,
    warning_threshold: float,
    critical_threshold: float,
    routes_info: List[dict]
) -> GeminiRecommendationSchema:
    """
    Generates operational recommendations using Gemini 2.5 Flash via the Google GenAI SDK.
    If the GenAI Client is not available or fails, falls back to heuristic generation.
    """
    if client:
        try:
            # Build route context
            routes_str = "\n".join([
                f"- Route '{r['name']}' (Type: {r['type']}, Status: {r['status']}, Priority: {r['priority']}, Emergency Lane: {r['is_emergency']})"
                for r in routes_info
            ])

            # Design prompt for the tactical agent
            prompt = f"""
            You are the Lead Operations AI Command Agent for the Apex Coliseum stadium operations dashboard.
            Analyze the following critical stadium incident and formulate a safety rerouting/mitigation advice.

            [Incident Details]
            - Threat Title: {title}
            - Alert Type: {alert_type}
            - Severity: {severity}
            - Description: {description}

            [Sector Information]
            - Sector Code: {zone_code} ({zone_name})
            - Current Occupancy Density: {density}%
            - Crowd Movement Speed: {speed}
            - Warning Threshold Limit: {warning_threshold}%
            - Critical Threshold Limit: {critical_threshold}%

            [Egress Routes from Sector {zone_code}]
            {routes_str}

            Based on this information, provide:
            1. An operational recommendation (a concise 1-sentence instruction on what safety teams or operators should do immediately).
            2. A technical reasoning statement (explaining why this recommendation helps reduce risk, citing metrics like density, speeds, or route counts).
            3. A checklist of 3 distinct, actionable suggested actions (e.g. unblocking specific routes, deploying responder teams, or redirecting signage).

            Formulate your response exactly to fit the requested schema.
            """

            logger.info(f"Dispatching GenAI request for alert type: {alert_type} in sector {zone_code}...")
            
            response = client.models.generate_content(
                model="gemini-2.5-flash",
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    response_schema=GeminiRecommendationSchema,
                    temperature=0.2,
                )
            )

            # Validate and parse response
            rec_obj = GeminiRecommendationSchema.model_validate_json(response.text)
            logger.info("GenAI recommendation generated successfully.")
            return rec_obj

        except Exception as e:
            logger.error(f"GenAI SDK execution failed: {e}. Cascading to operational fallback engine.")
            # Fall through to fallback engine

    # Fallback heuristic engine (Guarantees system operational integrity)
    logger.debug("Running heuristic fallback recommendation engine...")
    if alert_type == "congestion" or alert_type == "stampede_risk":
        rec_text = f"Immediately open blocked egress paths in Sector {zone_code} to increase flow capacity."
        reasoning = (
            f"Predicted surge risk index is high for Sector {zone_code} due to {speed} crowd flow. "
            f"Opening alternate exit channels reduces bottleneck pressure."
        )
        blocked_names = [r["name"] for r in routes_info if r["status"] in ["blocked", "restricted"]]
        route_action = f"Unblock exit routes ({', '.join(blocked_names)})" if blocked_names else "Clear egress routes"
        actions = [
            route_action,
            f"Deploy Crowd Control Security Team to assist {zone_name}",
            f"Redirect crowd using dynamic digital signage in {zone_code}"
        ]
    elif alert_type == "unusual_activity":
        rec_text = f"Dispatch Security Team to {zone_name} immediately to address unusual behavior."
        reasoning = f"Sensor analytics detected abnormal crowd dynamics in Sector {zone_code}. Visual verification is required."
        actions = [
            f"Deploy Responder Team to Zone {zone_code} corridor",
            "Direct CCTV Monitor Focus to sector camera feed",
            "Establish radio contact with sector stewards"
        ]
    else:
        rec_text = f"Monitor Sector {zone_code} closely. Verify CCTV telemetry status."
        reasoning = f"System warning issued for {zone_name}."
        actions = [
            f"Log event in system audit trail",
            f"Direct operator surveillance focus to Sector {zone_code}"
        ]

    return GeminiRecommendationSchema(
        recommendation=rec_text,
        reasoning=reasoning,
        suggested_actions=actions
    )
