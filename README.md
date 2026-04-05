# NEXUS-AI 🌐🛡️
### Autonomous Incident Investigation Dashboard

<div align="center">

![Python](https://img.shields.io/badge/Python-3.10+-3776AB?style=for-the-badge&logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-0.100+-009688?style=for-the-badge&logo=fastapi&logoColor=white)
![React](https://img.shields.io/badge/React-18.x-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![Tailwind](https://img.shields.io/badge/Tailwind_CSS-3.x-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)
![Ollama](https://img.shields.io/badge/Ollama-Local_LLM-000000?style=for-the-badge&logo=ollama)

**Status:** Active Simulation Pipeline  
**Architecture:** Real-time WebSockets + Multi-Agent Consensus

</div>

---

## 📖 What is NEXUS-AI?

NEXUS is a next-generation, autonomous dual-agent environment designed to investigate and validate software incidents in real-time. Using a combination of an **Investigator** and a **Validator** agent, NEXUS autonomously forms hypotheses, executes systems tools, evaluates system behavior, and reaches strict consensus on root causes.

Traditional manual debugging requires extensive context-switching and tool fatigue. NEXUS solves this through:
1. **Dual-Agent Autonomy**: Two specialized models communicating word-by-word via WebSockets.
2. **Dynamic Tool Execution**: Fully integrated system terminals allowing agents to run sandboxed validation scripts.
3. **Semantic Reward Engine**: Evaluates conversational drift mathematically (using native GPU embeddings).

The result: An AI "Incident Response Team" that navigates servers, traces logs, and fixes bugs identically to a human SRE.

---

## 🖼️ Application Screenshots

### 📊 Simulation Dashboard

> The core command center. Features live agent terminals, a dual-communication consensus log, and a mathematical performance reward graph plotting investigation confidence.

<div align="center">
  <img src="./assets/screenshots/Dashboard.png" alt="Simulation Dashboard" width="90%"/>
</div>

---

## 🎛️ Scenario Registry & Core Settings

> The system is architected for instant adaptability — seamlessly switch LLM providers and inject custom threat models entirely through the frontend DOM.

<table>
  <tr>
    <td align="center" width="50%">
      <img src="./assets/screenshots/Scenarios.png" alt="Scenario Browser"/>
      <br/><b>Scenario Registry</b>
      <br/><sub>A persistent LocalStorage-backed grid of tactical simulations. Users can dynamically inject custom infrastructure-specific incidents directly into the agent pipeline.</sub>
    </td>
    <td align="center" width="50%">
      <img src="./assets/screenshots/Settings.png" alt="Hardware Configuration"/>
      <br/><b>Runtime Configuration</b>
      <br/><sub>Dynamically maps available locally-installed Ollama networks, allowing the user to pair models (e.g., Qwen vs Dolphin-Phi) with fully independent parameters.</sub>
    </td>
  </tr>
</table>

---

## 🏗️ System Architecture

```text
																							┌─────────────────────────────────────────────────────────────────┐
																							│                    CLIENT BROWSER                               │
																							│          React SPA (Tailwind + Framer Motion)                   │
																							│          localhost:5173                                         │
																							└───────────┬─────────────────────────────────┬───────────────────┘
																													│ HTTP (REST)                     │ ws://
																													▼                                 ▼
																							┌─────────────────────────────────────────────────────────────────┐
																							│              FASTAPI BACKEND (localhost:7860)                   │
																							│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────────┐    │
																							│  │ /config  │ │/scenarios│ │  /reset  │ │  ws:// Simulator │    │
																							│  │ Env Sync │ │ DB Cache │ │ Injection│ │  Live Stream Sync│    │
																							│  └──────────┘ └──────────┘ └──────────┘ └──────────────────┘    │
																							└───────────┬───────────────────────────────────┬─────────────────┘
																													│                                   │
																													▼                                   ▼                            
																							┌─────────────────────────────────────────────────────────────────┐
																							│                  OLLAMA ENGINE / LLM PIPELINE                   │
																							│  Agent A (Investigator)   ◄──────►   Agent B (Validator)        │
																							│  - Generates Hypotheses              - Challenges Assertions    │
																							│  - Runs System Tools                 - Requires Proof           │
																							└─────────────────────────────────────────────────────────────────┘
```

---

## 🧠 The AI Pipeline Deep-Dive

### Step 1: Scenario Injection & Bootstrapping
```python
# The EpisodeManager receives the frontend custom scenario JSON
# Broadcasts 'episode_start' natively over the WebSocket to synchronize the UI
await broadcast("episode_start", {
    "scenario": active_scenario,
    "agent_a_model": settings.AGENT_A_MODEL
})
```

### Step 2: Agent Consensus Loop
```python
# Agents interact sequentially. The Investigator attempts a solution
# while the Validator challenges it. Both agents have access to dynamic system execution.
client, model_name = model_manager.get_client(agent_id)
stream = await client.chat.completions.create(
    model=model_name,
    messages=injected_history,
    tools=available_tools, # e.g. fix_proposer, run_terminal_command
    stream=True
)
```

### Step 3: Fast GPU Embeddings (Similarity Evaluation)
```python
# Heavy CPU blocking is completely bypassed.
# Semantic embedding computations map strictly into the Ollama GPU pipeline.
@lru_cache(maxsize=256)
def get_embedding(text: str) -> List[float]:
    response = httpx.post("http://localhost:11434/api/embeddings", json={
        "model": "all-minilm",
        "prompt": text
    }, timeout=60.0)
    return response.json().get("embedding", [])
```

---

## 🛠️ Full Technology Stack

| Layer | Technology | Why |
|---|---|---|
| Frontend Framework | React 18 (Vite) | Lightning fast HMR, component isolation |
| Frontend Styling | Tailwind CSS | Utility-first tactical glassmorphism |
| Backend Framework | FastAPI | Async Python, explicit endpoint mapping |
| Transport Layer | WebSockets | Word-by-word streaming across UI boundaries |
| Local AI Engine | Ollama | Native device acceleration, absolute privacy |
| Remote Provider | HuggingFace Inference API | Drop-in SaaS alternatives |
| Data Persistence | LocalStorage & `.env` Injection | Avoids over-architected SQL constraints |

---

## 🚀 How to Run This Project (Full Step-by-Step Guide)

### 📋 Prerequisites
- Python 3.10+
- Node.js 18+
- [Ollama](https://ollama.com/) (installed locally for model hosting)

---

### 1️⃣ Backend Setup (FastAPI / Python)

```bash
cd backend

# Create and activate virtual environment
python -m venv venv
# source venv/bin/activate       # Linux/macOS
venv\Scripts\activate        # Windows

# Install all dependencies
pip install -r requirements.txt
```

#### Start the Backend Engine
```bash
# This exposes the core REST API and the WebSocket simulation tunnel
python main.py
```

---

### 2️⃣ Frontend Setup (React)

Open a **new terminal tab**:

```bash
cd frontend

# Install Node.js dependencies
npm install

# Start the Vite development server
npm run dev
```

The application is now fully accessible at [http://localhost:5173](http://localhost:5173).

---

### 3️⃣ Pulling Models

To run the simulation locally without cloud API keys, you must ensure you pull suitable reasoning models through Ollama:

```bash
ollama run qwen2.5:3b     # Excellent validator logic footprint
ollama run dolphin-llama3 # Uncensored investigative assertions
ollama pull all-minilm    # Mandatory for semantic similarity scoring
```

---

## 🤝 Authors
**Developed by: Ashish Menon** & The NEXON-AI Architecture Team
