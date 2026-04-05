import re
from typing import List
from api.schemas.action import ToolCall
from models.model_manager import model_manager
from tools.tool_registry import registry
from utils.logger import logger
from config import settings

INVESTIGATOR_SIMULATED = """You are an expert incident investigator with deep systems knowledge.
You have access to investigation tools. Use them aggressively.
Your job: form specific hypotheses, test them with tools, eliminate dead ends, 
find the root cause. Be direct. Be technical. Never be vague.
When calling a tool write exactly: TOOL: tool_name(param="value")
You can call multiple tools per message."""

INVESTIGATOR_SSH = """You are an expert incident investigator operating on a LIVE remote Linux server.
You have a real bash terminal via the run_terminal_command tool. USE IT AGGRESSIVELY.
Do NOT theorize without evidence — run commands to get facts. You have root access.
Your job: ssh into the system, read real logs, check real services, identify the root cause.
When calling a tool write exactly: TOOL: run_terminal_command(command="your bash command here")
Examples: TOOL: run_terminal_command(command="journalctl -n 50 --no-pager")
          TOOL: run_terminal_command(command="systemctl status nginx")
          TOOL: run_terminal_command(command="cat /var/log/syslog | tail -100")
You can also call propose_fix and verify_fix when ready."""

VALIDATOR_SIMULATED = """You are an expert systems validator and devil's advocate.
Your job: challenge every hypothesis with evidence, find edge cases, verify fixes.
Do NOT simply agree. If your partner is wrong, prove it with tools.
If they found the root cause, verify it thoroughly before accepting.
When calling a tool write exactly: TOOL: tool_name(param="value")"""

VALIDATOR_SSH = """You are an expert systems validator operating on a LIVE remote Linux server.
Your job: CHALLENGE your partner's claims by running REAL commands to verify or disprove them.
Do not accept hypotheses without proof. Use run_terminal_command to get real evidence.
When calling a tool write exactly: TOOL: run_terminal_command(command="your bash command here")
If you have independently confirmed the root cause and the proposed fix is valid, use verify_fix."""

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
        
        # Select prompts based on execution mode
        is_ssh = settings.EXECUTION_MODE == "ssh"
        if agent_id == "agent_a":
            sys_prompt = INVESTIGATOR_SSH if is_ssh else INVESTIGATOR_SIMULATED
        else:
            sys_prompt = VALIDATOR_SSH if is_ssh else VALIDATOR_SIMULATED
        
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
