from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List
import logging
import json

from app.core.database import get_db
from app.core import models
from app.core.ai import client, GeminiRecommendationSchema

logger = logging.getLogger("AICopilotRouter")

router = APIRouter(prefix="/ai", tags=["ai"])

class ChatRequest(BaseModel):
    query: str

class CopilotAction(BaseModel):
    type: str # "update_route", "route_suggest", "emergency", "resolve_alert", "none"
    route_name: Optional[str] = None
    route_status: Optional[str] = None # "open", "blocked"
    zone_code: Optional[str] = None
    alert_id: Optional[str] = None
    emergency_active: Optional[bool] = None

class CopilotResponse(BaseModel):
    response: str
    action: CopilotAction

@router.post("/chat", response_model=CopilotResponse)
async def chat_with_copilot(payload: ChatRequest, db: Session = Depends(get_db)):
    query = payload.query.strip()
    
    # 1. Fetch live stadium metrics to feed into the prompt context
    zones = db.query(models.Zone).all()
    routes = db.query(models.Route).all()
    alerts = db.query(models.Alert).filter(models.Alert.status == "active").all()
    vips = db.query(models.VipMovement).all()
    
    zones_context = [
        f"- {z.code} ({z.name}): Density={float(z.current_density)}%, Speed={z.movement_speed}, Risk={z.risk_level}, Limits=[Warn: {float(z.warning_threshold)}%, Crit: {float(z.critical_threshold)}%]"
        for z in zones
    ]
    routes_context = [
        f"- Route '{r.name}' (From: {db.query(models.Zone).filter(models.Zone.id == r.from_zone_id).first().code if r.from_zone_id else 'None'}, To: {r.to_location}, Status: {r.status}, Type: {r.route_type})"
        for r in routes
    ]
    alerts_context = [
        f"- Alert [{a.id[:8]}]: {a.title} ({a.severity}) in {a.zone_code}. Desc: {a.description}"
        for a in alerts
    ]
    vips_context = [
        f"- VIP Convoy '{v.vip_name}': Status={v.movement_status}, Primary Route ID={v.primary_route_id[:8] if v.primary_route_id else 'None'}"
        for v in vips
    ]
    alerts_str = "None" if not alerts_context else "\n".join(alerts_context)
    zones_str = "\n".join(zones_context)
    routes_str = "\n".join(routes_context)
    vips_str = "None" if not vips_context else "\n".join(vips_context)

    # 2. Call Gemini model if client is initialized
    if client:
        try:
            from google.genai import types
            
            prompt = f"""
            You are the Tactical AI Copilot Agent for the Apex Coliseum Stadium Command Center, designed to assist operations and security stewards.
            Analyze the live operational dashboard state and answer the operator's query.
            If the operator explicitly requests a system action (like opening/blocking a route, activating emergency evacuation, calculating Dijkstra egress routing, or resolving an alert), specify the structural change in the `action` JSON parameter.

            [Live Stadium Active Alerts]
            {alerts_str}

            [Live Sectors Occupancies]
            {zones_str}

            [Live Egress Routes]
            {routes_str}

            [Live VIP Movements]
            {vips_str}

            [Operator Query]
            "{query}"

            [Instructions]
            - If the operator wants to open/unblock or close/block a route (e.g. "unblock route R-08" or "open R-02"), set action:
              `type` = "update_route", `route_name` = exact route name (e.g. "R-08"), `route_status` = "open" or "blocked".
            - If the operator wants to find a route or evacuate a zone (e.g. "route from zone D" or "evacuate Gate A"), set action:
              `type` = "route_suggest", `zone_code` = exact zone code (e.g. "ZONE_D").
            - If the operator wants to trigger/stop emergency mode (e.g. "trigger evacuation alert" or "turn off emergency"), set action:
              `type` = "emergency", `emergency_active` = true or false.
            - If the operator wants to resolve an active alert (e.g. "resolve alert a1" or "clear alert a2"), set action:
              `type` = "resolve_alert", `alert_id` = the alert ID (or matching seeded alert ID like "a1" or "a2").
            - If the operator is just asking a question (e.g. "what is the occupancy of sector D?"), set action `type` = "none".
            - Provide a clear, professional conversational response explaining what you did or answering their question.
            """

            logger.info("Sending command to Gemini Copilot...")
            response = client.models.generate_content(
                model="gemini-2.5-flash",
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    response_schema=CopilotResponse,
                    temperature=0.1
                )
            )
            
            copilot_res = CopilotResponse.model_validate_json(response.text)
            logger.info("Gemini Copilot responded successfully.")
            return copilot_res

        except Exception as e:
            logger.error(f"Gemini Copilot request failed: {e}. Falling back to heuristic interpreter.")

    # 3. Fallback Heuristic Interpreter (Guarantees system operational integrity)
    logger.debug("Executing copilot fallback heuristic parsing...")
    
    q_lower = query.lower()
    resp_text = ""
    act_type = "none"
    act_route_name = None
    act_route_status = None
    act_zone_code = None
    act_alert_id = None
    act_emerg = None

    # 1. Parse update_route
    if "unblock" in q_lower or "open" in q_lower:
        for r in routes:
            if r.name.lower() in q_lower:
                act_type = "update_route"
                act_route_name = r.name
                act_route_status = "open"
                resp_text = f"Command Agent: Processing request to open Route {r.name} to clear traffic."
                break
    elif "block" in q_lower or "close" in q_lower:
        for r in routes:
            if r.name.lower() in q_lower:
                act_type = "update_route"
                act_route_name = r.name
                act_route_status = "blocked"
                resp_text = f"Command Agent: Restricting Route {r.name} to general access."
                break

    # 2. Parse emergency override
    elif "emergency" in q_lower or "evacuate stadium" in q_lower or "evacuation alert" in q_lower:
        act_type = "emergency"
        if "stop" in q_lower or "disable" in q_lower or "off" in q_lower or "clear" in q_lower or "deactivate" in q_lower:
            act_emerg = False
            resp_text = "Command Agent: Terminating global evacuation override. Reverting zones to default bounds."
        else:
            act_emerg = True
            resp_text = "Command Agent: CRITICAL OVERRIDE. Activating system-wide evacuation alerts and opening emergency lanes."

    # 3. Parse resolve_alert
    elif "resolve" in q_lower or "clear alert" in q_lower:
        for a in alerts:
            if a.id in query or a.id[:8] in query or a.zone_code.lower() in q_lower or a.alert_type in q_lower:
                act_type = "resolve_alert"
                act_alert_id = a.id
                resp_text = f"Command Agent: Resolving alert [{a.title}] in Sector {a.zone_code}."
                break

    # 4. Parse route_suggest / evacuate (fallback only if no other match)
    elif "evacuate" in q_lower or "route" in q_lower or "egress" in q_lower or "path" in q_lower:
        for z in zones:
            if z.code.lower() in q_lower or z.name.lower() in q_lower:
                act_type = "route_suggest"
                act_zone_code = z.code
                resp_text = f"Command Agent: Triggering dynamic Dijkstra egress calculations for Sector {z.code} ({z.name})."
                break

    # General Query fallback
    if not resp_text:
        num_alerts = len(alerts)
        active_str = f"There are currently {num_alerts} active threat alerts flagged." if num_alerts > 0 else "All sectors report safe status."
        
        # Find highest density zone
        if zones:
            highest_zone = max(zones, key=lambda z: float(z.current_density))
            resp_text = (
                f"Command Agent Analyst: {active_str} Sector {highest_zone.code} ({highest_zone.name}) "
                f"reports the highest crowd density at {float(highest_zone.current_density):.1f}% (Status: {highest_zone.risk_level})."
            )
        else:
            resp_text = f"Command Agent Analyst: Database link active. {active_str}"

    return CopilotResponse(
        response=resp_text,
        action=CopilotAction(
            type=act_type,
            route_name=act_route_name,
            route_status=act_route_status,
            zone_code=act_zone_code,
            alert_id=act_alert_id,
            emergency_active=act_emerg
        )
    )
