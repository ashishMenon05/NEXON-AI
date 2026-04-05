from pydantic import BaseModel
from typing import Any

class UpdateConfigParams(BaseModel):
    service: str
    key: str
    value: str

def tool_update_config(params: dict, scenario: dict, round_num: int, episode_state) -> str:
    service = params.get("service", "").lower()
    key = params.get("key", "").lower()
    value = params.get("value", "")
    
    if not hasattr(episode_state, "system_state"):
        return "Error: Simulation environment does not support mutable state."
        
    if service not in episode_state.system_state:
        return f"Error: Command failed. Service '{service}' not found in system state."
        
    # Cast value to int if it looks like one, since some configs are numeric
    try:
        val = int(value)
    except ValueError:
        val = value
        
    episode_state.system_state[service][key] = val
    return f"SUCCESS: Configuration for {service} updated. {key}={val}. You may need to restart/reload the service for changes to take effect."
