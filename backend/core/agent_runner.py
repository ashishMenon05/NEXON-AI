import re
from typing import List
from api.schemas.action import ToolCall
from models.model_manager import model_manager
from tools.tool_registry import registry
from utils.logger import logger

INVESTIGATOR_SYSTEM = """You are an expert incident investigator with deep systems knowledge.
You have access to investigation tools. Use them aggressively.
Your job: form specific hypotheses, test them with tools, eliminate dead ends, 
find the root cause. Be direct. Be technical. Never be vague.
When calling a tool write exactly: TOOL: tool_name(param="value")
You can call multiple tools per message."""

VALIDATOR_SYSTEM = """You are an expert systems validator and devil's advocate.
Your job: challenge every hypothesis with evidence, find edge cases, verify fixes.
Do NOT simply agree. If your partner is wrong, prove it with tools.
If they found the root cause, verify it thoroughly before accepting.
When calling a tool write exactly: TOOL: tool_name(param="value")"""

class AgentRunner:
    def parse_tool_calls(self, message: str) -> List[ToolCall]:
        # Parse "TOOL: tool_name(param="value")"
        tool_calls = []
        pattern = r'TOOL:\s*([a-zA-Z0-9_]+)\((.*?)\)'
        matches = re.finditer(pattern, message)
        
        for match in matches:
            tool_name = match.group(1)
            params_str = match.group(2)
            
            # Simple param parsing - expects key="value", key='value' or key=value
            params = {}
            if params_str.strip():
                param_pairs = params_str.split(',')
                for pair in param_pairs:
                    if '=' in pair:
                        k, v = pair.split('=', 1)
                        k = k.strip()
                        v = v.strip().strip('"').strip("'")
                        params[k] = v
            
            tool_calls.append(ToolCall(tool_name=tool_name, params=params))
            
        return tool_calls

    async def execute_tool_calls(self, tool_calls: List[ToolCall], scenario: dict, round_num: int, episode_state) -> List[dict]:
        results = []
        for tc in tool_calls:
            # We call the registry. In reality, MCP might be external but here it's in-process registry calls
            # Episode state is passed for propose_fix and verify_fix
            res_str = registry.call_tool(tc.tool_name, tc.params, scenario, round_num, episode_state)
            
            # Record it in state
            episode_state.add_tool_call(tc.tool_name, tc.params)
            
            results.append({
                "tool_name": tc.tool_name,
                "result": res_str,
                "success": not res_str.startswith("Error")
            })
        return results

    async def run_step(self, agent_id: str, episode_state, scenario: dict):
        client, model_name = model_manager.get_client(agent_id)
        
        # Determine prompt
        sys_prompt = INVESTIGATOR_SYSTEM if agent_id == "agent_a" else VALIDATOR_SYSTEM
        
        # Build context
        context = f"Current incident: {scenario.get('description', '')}\n"
        if hasattr(episode_state, 'last_partner_message') and episode_state.last_partner_message:
            context += f"Partner's last message: {episode_state.last_partner_message}\n"
        if hasattr(episode_state, 'clues_found') and episode_state.clues_found:
            context += f"Clues found: {episode_state.clues_found}\n"
        # Note: don't mention rounds - let agents reason freely until consensus
        
        # We append history
        messages = [{"role": "system", "content": sys_prompt}]
        
        # Add a summary of previous messages
        if hasattr(episode_state, 'all_messages'):
            all_msgs = episode_state.all_messages[-3:] # only last 3 to fit context
            if all_msgs:
                context += "\nRecent history:\n"
                for m in all_msgs:
                    context += f"- {m}\n"
                
        messages.append({"role": "user", "content": context})
        
        # Call model with streaming
        full_response = ""
        try:
            stream = await client.chat.completions.create(
                model=model_name,
                messages=messages,
                max_tokens=2048,
                timeout=60.0,
                stream=True
            )
            async for chunk in stream:
                content = chunk.choices[0].delta.content or ""
                if content:
                    full_response += content
                    yield content # Yield partial chunk
        except Exception as e:
            logger.error(f"Error calling model {model_name} for {agent_id}: {e}")
            full_response = "I encountered an error analyzing the situation. Let me try again next round."
            yield full_response
            
        # Final yielding of special end marker or just finish
        # The caller (openenv.py) will collect all yielded values to build the full response
        # and then call runner.parse_tool_calls(full_message) themselves.
        pass
