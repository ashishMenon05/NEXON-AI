from pydantic import BaseModel

class RestartServiceParams(BaseModel):
    service: str

def tool_restart_service(params: dict, scenario: dict, round_num: int, episode_state) -> str:
    service = params.get("service", "").lower()
    
    if not hasattr(episode_state, "system_state"):
        return "Error: Simulation environment does not support mutable state."
        
    if service not in episode_state.system_state:
        return f"Error: Failed to restart. Service '{service}' not found."
        
    episode_state.system_state[service]["status"] = "running"
    episode_state.system_state[service]["last_reload"] = "Just now"
    
    return f"SUCCESS: Service {service} restarted/reloaded. New configuration has been applied to memory."
