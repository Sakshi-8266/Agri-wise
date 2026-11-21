import os
import json
import base64
import requests
from typing import Optional, Dict, Any
from sqlalchemy.orm import Session
from ..config import settings
from ..models import User, Farm, CropRecord
from .weather_service import weather_service
from .decision_engine import decision_engine
from .rag_assistant import rag_service

class ElevenLabsVoiceService:
    """
    ElevenLabs Conversational AI & Multilingual Voice Service
    Connects Agriwise platform with ElevenLabs Agents Platform and Text-to-Speech API.
    """

    def __init__(self):
        self.api_key = settings.ELEVENLABS_API_KEY
        self.agent_id = settings.ELEVENLABS_AGENT_ID
        self.default_voice_id = settings.ELEVENLABS_VOICE_ID or "21m00Tcm4TlvDq8ikWAM"
        self.base_url = "https://api.elevenlabs.io/v1"

    def get_config(self) -> Dict[str, Any]:
        """
        Returns safe configuration status for frontend clients without exposing private API keys.
        """
        has_key = bool(settings.ELEVENLABS_API_KEY and len(settings.ELEVENLABS_API_KEY.strip()) > 5)
        has_agent = bool(settings.ELEVENLABS_AGENT_ID and len(settings.ELEVENLABS_AGENT_ID.strip()) > 5)

        return {
            "has_api_key": has_key,
            "has_agent_id": has_agent,
            "agent_id": settings.ELEVENLABS_AGENT_ID if has_agent else None,
            "default_voice_id": self.default_voice_id,
            "multilingual_supported": True,
            "languages": [
                {"code": "hi", "name": "Hindi (हिंदी)", "voice": "natural-multilingual"},
                {"code": "en", "name": "English (Indian/Global)", "voice": "natural-multilingual"}
            ]
        }

    def get_signed_url(self, agent_id: Optional[str] = None) -> Dict[str, Any]:
        """
        Securely retrieves a signed WebSocket URL from ElevenLabs Conversational AI API.
        The client uses this temporary signed URL to establish an authenticated WebRTC/WebSocket session
        without exposing the secret API key.
        """
        target_agent_id = agent_id or settings.ELEVENLABS_AGENT_ID
        api_key = settings.ELEVENLABS_API_KEY

        if not api_key:
            return {
                "success": False,
                "error": "ELEVENLABS_API_KEY is not configured in backend environment (.env).",
                "requires_setup": True
            }

        if not target_agent_id:
            return {
                "success": False,
                "error": "ELEVENLABS_AGENT_ID is not configured in backend environment (.env).",
                "requires_setup": True
            }

        try:
            url = f"{self.base_url}/convai/conversation/get-signed-url?agent_id={target_agent_id}"
            headers = {
                "xi-api-key": api_key
            }
            resp = requests.get(url, headers=headers, timeout=8)

            if resp.status_code == 200:
                data = resp.json()
                signed_url = data.get("signed_url")
                return {
                    "success": True,
                    "signed_url": signed_url,
                    "agent_id": target_agent_id
                }
            else:
                return {
                    "success": False,
                    "error": f"ElevenLabs API error: {resp.status_code} - {resp.text}",
                    "status_code": resp.status_code
                }
        except Exception as e:
            return {
                "success": False,
                "error": f"Failed to connect to ElevenLabs API: {str(e)}"
            }

    def get_farmer_context(
        self,
        db: Session,
        user: Optional[User],
        location_name: Optional[str] = "Meerut, Uttar Pradesh",
        lat: Optional[float] = 28.9845,
        lon: Optional[float] = 77.7064
    ) -> Dict[str, Any]:
        """
        Synthesizes live agricultural and weather telemetry into a rich system prompt and dynamic variables
        to prime the ElevenLabs Conversational Agent with real-time farm knowledge.
        """
        farmer_name = user.name if user else "Ramesh Patel"
        farmer_phone = getattr(user, "phone", "+91 98765 43210") if user else "+91 98765 43210"
        user_id = user.id if user else 1

        # Retrieve farms and crops
        farms = db.query(Farm).filter(Farm.owner_id == user_id).all() if user else []
        farm_ids = [f.id for f in farms]
        crops = db.query(CropRecord).filter(CropRecord.farm_id.in_(farm_ids)).all() if farm_ids else []

        farm_loc = location_name or (farms[0].location if farms else "Meerut, Uttar Pradesh")
        farm_soil = farms[0].soil_type if farms else "Alluvial Sandy Loam (pH 7.4)"
        farm_area = sum(f.area for f in farms) if farms else 18.5

        active_crop_names = [f"{c.crop_name} ({c.growth_stage}, {c.season})" for c in crops if c.status == "ACTIVE"]
        if not active_crop_names:
            active_crop_names = ["Sharbati Wheat (Vegetative Growth)", "Hybrid Organic Tomato (Flowering / Fruiting)"]

        # Localized Weather Intelligence
        resolved_lat = lat or (28.9845 if "meerut" in farm_loc.lower() else 28.9845)
        resolved_lon = lon or (77.7064 if "meerut" in farm_loc.lower() else 77.7064)
        weather_info = weather_service.get_weather(lat=resolved_lat, lon=resolved_lon, location_name=farm_loc)

        current_temp = weather_info.get("temperature", 26.5)
        current_humidity = weather_info.get("humidity", 65.0)
        current_condition = weather_info.get("condition", "Partly Cloudy")

        # Proactive Smart Weather Crop Protection Alert (Meerut Rainfall Case)
        is_meerut = "meerut" in farm_loc.lower() or "uttar pradesh" in farm_loc.lower()
        upcoming_rain_note = (
            "URGENT WEATHER WARNING: Rainfall (~19.4 mm, 85% probability) forecast in 4 days. "
            "Advise farmer to: 1) Postpone nitrogen broadcasting and chemical spraying to avoid runoff. "
            "2) Clear field drainage furrows to avoid root waterlogging. 3) Elevate harvested bags to dry storage."
            if is_meerut else
            "Weather is largely stable. Clear spraying window over the next 48 hours."
        )

        # Dynamic System Prompt Prompting for Multilingual Agronomy Expert
        system_prompt = (
            f"You are Rakshak AI, an empathetic, highly knowledgeable agricultural expert and agronomist speaking to farmer {farmer_name}. "
            f"Farm Location: {farm_loc} ({resolved_lat}° N, {resolved_lon}° E). "
            f"Soil: {farm_soil}, Total Landholding: {farm_area} acres. "
            f"Standing Crops: {', '.join(active_crop_names)}. "
            f"Current Weather: {current_temp}°C, Humidity: {current_humidity}%, Condition: {current_condition}. "
            f"Weather Alert: {upcoming_rain_note} "
            f"GUIDELINES: "
            f"1. You speak naturally and fluidly in both Hindi (हिंदी) and English (or Hinglish if the farmer mixes). "
            f"2. Always greet respectfully ('Namaste {farmer_name} ji' or 'Hello {farmer_name}'). "
            f"3. Provide practical, ICAR-grounded advice for crop diseases, fertilization, irrigation, and weather protection. "
            f"4. Keep answers concise, actionable, and conversational so voice responses are easy to listen to. "
            f"5. If asked about the weather in Meerut or upcoming rain, explicitly remind them about the 4-day rainfall forecast and how to protect their wheat and tomato crops."
        )

        return {
            "farmer_name": farmer_name,
            "farmer_phone": farmer_phone,
            "location": farm_loc,
            "latitude": resolved_lat,
            "longitude": resolved_lon,
            "soil_type": farm_soil,
            "total_area_acres": farm_area,
            "standing_crops": active_crop_names,
            "current_temperature": current_temp,
            "current_humidity": current_humidity,
            "weather_condition": current_condition,
            "weather_alert": upcoming_rain_note,
            "system_prompt": system_prompt,
            "dynamic_variables": {
                "farmer_name": farmer_name,
                "location": farm_loc,
                "primary_crops": ", ".join(active_crop_names[:2]),
                "temperature": f"{current_temp}°C",
                "soil_type": farm_soil,
                "weather_alert": "Rain expected in 4 days" if is_meerut else "Normal weather"
            }
        }

    def text_to_speech(
        self,
        text: str,
        voice_id: Optional[str] = None,
        model_id: str = "eleven_multilingual_v2"
    ) -> Dict[str, Any]:
        """
        Synthesizes human-like natural Hindi and English speech using ElevenLabs Text-to-Speech API.
        Returns base64 encoded audio for instant browser playback.
        """
        api_key = settings.ELEVENLABS_API_KEY
        if not api_key:
            return {
                "success": False,
                "error": "ELEVENLABS_API_KEY not configured. Falling back to browser speech synthesis.",
                "requires_setup": True
            }

        target_voice = voice_id or self.default_voice_id
        url = f"{self.base_url}/text-to-speech/{target_voice}"

        headers = {
            "xi-api-key": api_key,
            "Content-Type": "application/json",
            "Accept": "audio/mpeg"
        }

        payload = {
            "text": text,
            "model_id": model_id,
            "voice_settings": {
                "stability": 0.5,
                "similarity_boost": 0.8,
                "style": 0.15,
                "use_speaker_boost": True
            }
        }

        try:
            resp = requests.post(url, headers=headers, json=payload, timeout=12)
            if resp.status_code == 200:
                audio_b64 = base64.b64encode(resp.content).decode("utf-8")
                return {
                    "success": True,
                    "audio_base64": f"data:audio/mpeg;base64,{audio_b64}",
                    "format": "mp3",
                    "voice_id": target_voice,
                    "model_id": model_id
                }
            else:
                return {
                    "success": False,
                    "error": f"ElevenLabs TTS returned HTTP {resp.status_code}: {resp.text}"
                }
        except Exception as e:
            return {
                "success": False,
                "error": f"TTS synthesis error: {str(e)}"
            }

elevenlabs_service = ElevenLabsVoiceService()
