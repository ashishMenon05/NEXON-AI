import json
from datetime import datetime
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from typing import List
from utils.logger import logger

router = APIRouter()

class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        logger.info(f"WebSocket connected. Total: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)
        logger.info(f"WebSocket disconnected. Total: {len(self.active_connections)}")

    async def broadcast(self, event_type: str, payload: dict):
        message = {
            "type": event_type,
            "timestamp": datetime.utcnow().isoformat(),
            **payload
        }
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except Exception as e:
                logger.error(f"Error sending broadcast: {e}")

manager = ConnectionManager()
broadcast = manager.broadcast

@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        from core.episode_manager import episode_manager
        from api.routes.openenv import start_simulation
        
        while True:
            data = await websocket.receive_text()
            try:
                cmd = json.loads(data)
                action = cmd.get("action")
                
                if action == "start":
                    await start_simulation()
                elif action == "pause":
                    episode_manager.is_paused = not episode_manager.is_paused
                    await broadcast("system_status", {"paused": episode_manager.is_paused})
                elif action == "reset":
                    await episode_manager.reset(task="software-incident")
                elif action == "force_end":
                    if episode_manager.env and episode_manager.env.active_episode:
                        # Force done conditions
                        episode_manager.env.active_episode.done = True
                        episode_manager.env.active_episode.fix_verified = True
            except Exception as e:
                logger.error(f"Error handling WS command: {e}")
    except WebSocketDisconnect:
        manager.disconnect(websocket)
