from fastapi import APIRouter
from config import settings
from pydantic import BaseModel
from utils.hardware import check_hardware

router = APIRouter()

from typing import List, Dict, Any

class AgentConfig(BaseModel):
    id: str
    model: str
    provider: str
    role: str = "INVESTIGATOR"
    system_prompt: str = ""
    temperature: float = 0.7

class ConfigUpdate(BaseModel):
    MAX_STEPS: int
    AGENTS: List[AgentConfig]
    EXECUTION_MODE: str = "simulated"
    SSH_HOST: str = ""
    SSH_PORT: int = 22
    SSH_USER: str = ""
    SSH_PASSWORD: str = ""
    OPENAI_API_KEY: str = ""

@router.get("/config")
def get_config():
    hw = check_hardware()
    return {
        "models": {
            "agents": settings.AGENTS,
            "openai_api_key": getattr(settings, "OPENAI_API_KEY", "")
        },
        "episode": {
            "max_steps": settings.MAX_STEPS,
            "max_time": settings.MAX_EPISODE_TIME_SECONDS
        },
        "execution": {
            "mode": settings.EXECUTION_MODE,
            "ssh_host": settings.SSH_HOST,
            "ssh_port": settings.SSH_PORT,
            "ssh_user": settings.SSH_USER,
            "ssh_password": settings.SSH_PASSWORD
        },
        "hardware": hw
    }

@router.post("/config")
def update_config(req: ConfigUpdate):
    settings.MAX_STEPS = req.MAX_STEPS
    # Convert Pydantic models to dicts
    settings.AGENTS = [a.model_dump() for a in req.AGENTS]
    settings.EXECUTION_MODE = req.EXECUTION_MODE
    settings.SSH_HOST = req.SSH_HOST
    settings.SSH_PORT = req.SSH_PORT
    settings.SSH_USER = req.SSH_USER
    settings.SSH_PASSWORD = req.SSH_PASSWORD
    settings.OPENAI_API_KEY = req.OPENAI_API_KEY
    
    # Persist to default.env
    from models.model_manager import model_manager
    import json
    model_manager._update_env_file({
        "MAX_STEPS": req.MAX_STEPS,
        "AGENTS_JSON": json.dumps(settings.AGENTS),
        "EXECUTION_MODE": req.EXECUTION_MODE,
        "SSH_HOST": req.SSH_HOST,
        "SSH_PORT": req.SSH_PORT,
        "SSH_USER": req.SSH_USER,
        "SSH_PASSWORD": req.SSH_PASSWORD,
        "OPENAI_API_KEY": req.OPENAI_API_KEY
    })
    
    return {"status": "success", "message": "Config updated for next episode"}

@router.post("/pause")
def pause():
    from core.episode_manager import episode_manager
    episode_manager.is_paused = not episode_manager.is_paused
    return {"paused": episode_manager.is_paused}

@router.post("/config/ssh-test")
def test_ssh_connection():
    """Test the currently configured SSH credentials without saving."""
    from utils.ssh_client import execute_ssh_command
    result = execute_ssh_command("echo nexus_ping_ok")
    success = result["exit_code"] == 0 and "nexus_ping_ok" in result["stdout"]
    return {
        "success": success,
        "error": result["stderr"] if not success else None
    }
