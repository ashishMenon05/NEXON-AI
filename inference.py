#!/usr/bin/env python3
"""
NEXUS Inference Script — OpenEnv Competition Submission
"""

import os
import sys
import asyncio
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT))
sys.path.insert(0, str(ROOT / "backend"))

from dotenv import load_dotenv
load_dotenv(ROOT / "default.env")

MODEL_NAME = os.environ.get("MODEL_NAME", "meta-llama/Llama-3.1-8B-Instruct")
OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY", "")
HF_TOKEN = os.environ.get("HF_TOKEN", "")

if OPENAI_API_KEY:
    API_KEY = OPENAI_API_KEY
    API_BASE_URL = "https://api.openai.com/v1"
elif HF_TOKEN and HF_TOKEN not in ("", "ollama", "your_huggingface_token_here", "hf_YourTokenHere"):
    API_KEY = HF_TOKEN
    API_BASE_URL = "https://router.huggingface.co/v1"
else:
    API_KEY = ""
    API_BASE_URL = "https://router.huggingface.co/v1"

from openai import OpenAI
client = OpenAI(base_url=API_BASE_URL, api_key=API_KEY)

from backend.core.environment import NexusEnvironment
from backend.api.schemas.action import NexusAction, ToolCall

def parse_tool_calls(text: str) -> list:
    tool_calls = []
    for match in re.finditer(r"TOOL:\s*([a-zA-Z0-9_]+)\(([^)]*)\)", text):
        name = match.group(1)
        args_s = match.group(2)
        params = {}
        for kv in re.finditer(r"(\w+)=['\"]?([^,'\"]+)['\"]?", args_s):
            params[kv.group(1)] = kv.group(2)
        tool_calls.append(ToolCall(tool_name=name, params=params))
    return tool_calls

TASKS = [
    {"name": "software-incident", "difficulty": "easy"},
    {"name": "business-process-failure", "difficulty": "medium"},
    {"name": "cascade-system-failure", "difficulty": "hard"},
]

SYSTEM_PROMPT = (
    "You are an expert incident investigator. "
    "Format tool calls as: TOOL: tool_name(param='value') "
    "Available tools: read_logs, check_config, query_database, check_service_status, "
    "propose_fix, verify_fix"
)

MAX_STEPS = int(os.environ.get("MAX_STEPS", "8"))

def _print(line: str):
    print(line, flush=True)

async def run():
    try:
        env = NexusEnvironment()
        
        for task in TASKS:
            _print(f"[START] task={task['name']} env=nexus-incident-investigation model={MODEL_NAME}")
            
            try:
                obs = await env.reset(task=task["name"], seed=42)
            except Exception as e:
                _print(f"[STEP] step=1 error=\"reset failed: {str(e)[:100]}\"")
                continue
            
            messages = [{"role": "system", "content": SYSTEM_PROMPT}]
            done = False
            step_n = 0
            rewards = []

            while not done and step_n < MAX_STEPS:
                step_n += 1

                user_content = (
                    f"Scenario: {obs.scenario_description}\n"
                    f"Context: {obs.scenario_context}\n"
                    f"Round {obs.round}. Investigate and call tools."
                )
                messages.append({"role": "user", "content": user_content})

                action_text = ""
                try:
                    resp = client.chat.completions.create(
                        model=MODEL_NAME,
                        messages=messages,
                        max_tokens=300,
                        temperature=0.7,
                        timeout=120.0
                    )
                    action_text = resp.choices[0].message.content or ""
                except Exception as e:
                    _print(f"[STEP] step={step_n} error=\"{str(e)[:100]}\"")
                    break

                messages.append({"role": "assistant", "content": action_text})

                tool_calls = parse_tool_calls(action_text)
                action = NexusAction(
                    agent_id="agent_a",
                    message=action_text,
                    tool_calls=tool_calls,
                    confidence=0.8
                )
                
                try:
                    obs, reward, done, info = await env.step(action)
                except Exception as e:
                    _print(f"[STEP] step={step_n} error=\"step failed: {str(e)[:100]}\"")
                    break
                    
                rewards.append(reward)

                clean = action_text.replace("\n", " ")[:200]
                _print(
                    f'[STEP] step={step_n} action="{clean}" '
                    f'reward={reward:.2f} done={str(done).lower()} error=null'
                )

            final_score = info.get("final_score", rewards[-1] if rewards else 0.0) if 'info' in dir() else 0.0
            success = final_score >= 0.5
            rewards_str = ",".join(f"{r:.2f}" for r in rewards)
            _print(
                f"[END] success={str(success).lower()} steps={step_n} "
                f"score={final_score:.3f} rewards={rewards_str}"
            )
    except Exception as e:
        _print(f"[ERROR] {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(run())
