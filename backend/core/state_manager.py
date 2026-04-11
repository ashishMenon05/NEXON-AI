import uuid
from typing import List, Dict, Any
from api.schemas.state import NexusState

class EpisodeState:
    def __init__(self, scenario_id: str, task: str, difficulty: str, max_rounds: int, scenario_data: dict = None):
        self.episode_id = str(uuid.uuid4())
        self.scenario_id = scenario_id
        self.task = task
        self.difficulty = difficulty
        self.current_round = 1
        self.max_rounds = max_rounds
        
        from config import settings
        self.messages_by_agent: Dict[str, List[str]] = {a["id"]: [] for a in settings.AGENTS}
        self.all_messages: List[str] = []
        
        self.tool_calls_made: List[Dict] = []
        self.clues_found: List[str] = []
        
        self.last_partner_message: str = ""
        self.previous_tool_calls: List[str] = []
        
        self.root_cause_found = False
        self.fix_proposed = False
        self.fix_correct = False
        self.fix_verified = False
        
        self.cumulative_reward = 0.0
        self.reward_history: List[float] = []
        self.done = False
        
        self.investigation_stage = "investigating"
        self.steps_taken = 0
        
        import copy
        self.system_state = copy.deepcopy(scenario_data.get("initial_state", {})) if scenario_data else {}

    def add_message(self, agent_id: str, message: str):
        self.steps_taken += 1
        self.all_messages.append(message)
        if agent_id not in self.messages_by_agent:
            self.messages_by_agent[agent_id] = []
        self.messages_by_agent[agent_id].append(message)
        
        from config import settings
        # A full round is defined as all agents having spoken at least once in the current sequence
        # We can approximate this by incrementing round when the last agent in the list speaks
        if settings.AGENTS and agent_id == settings.AGENTS[-1]["id"]:
            self.current_round += 1
            
        self.last_partner_message = message
        
    def add_tool_call(self, tool_name: str, params: dict):
        call_signature = f"{tool_name}:{str(params)}"
        self.tool_calls_made.append({"tool_name": tool_name, "params": params})
        self.previous_tool_calls.append(call_signature)
        
    def add_clue(self, clue: str):
        if clue not in self.clues_found:
            self.clues_found.append(clue)

    def to_pydantic(self) -> NexusState:
        return NexusState(
            episode_id=self.episode_id,
            scenario_id=self.scenario_id,
            task=self.task,
            difficulty=self.difficulty,
            current_round=self.current_round,
            max_rounds=self.max_rounds,
            messages_by_agent=self.messages_by_agent,
            tool_calls_made=self.tool_calls_made,
            clues_found=self.clues_found,
            root_cause_found=self.root_cause_found,
            fix_proposed=self.fix_proposed,
            fix_verified=self.fix_verified,
            cumulative_reward=self.cumulative_reward,
            reward_history=self.reward_history,
            done=self.done,
            investigation_stage=self.investigation_stage
        )
