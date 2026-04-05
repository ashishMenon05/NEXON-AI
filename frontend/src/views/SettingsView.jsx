import React, { useState, useEffect } from 'react';

const OllamaModelPicker = ({ value, onChange, accentColor }) => {
    const [models, setModels] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const fetchModels = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch('http://localhost:7860/models');
            if (!res.ok) throw new Error('Backend not reachable');
            const data = await res.json();
            setModels((data.local_models || []).map(m => ({name: m})));
        } catch (e) {
            setError('Backend offline or Ollama disconnected');
            setModels([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchModels(); }, []);

    const borderClass = accentColor === 'primary' ? 'border-primary/30 focus:border-primary' : 'border-secondary/30 focus:border-secondary';
    const textClass = accentColor === 'primary' ? 'text-primary' : 'text-secondary';

    return (
        <div className="space-y-2">
            <div className="flex justify-between items-center">
                <label className="font-mono text-[10px] tracking-widest text-slate-400 uppercase">Local Ollama Models</label>
                <button
                    onClick={fetchModels}
                    className={`flex items-center gap-1 text-[9px] font-mono ${textClass} hover:opacity-70 transition-opacity`}
                >
                    <span className={`material-symbols-outlined text-xs ${loading ? 'animate-spin' : ''}`}>refresh</span>
                    {loading ? 'Scanning...' : 'Refresh'}
                </button>
            </div>
            {error ? (
                <div className="flex items-center gap-2 py-2 border-b border-error/30">
                    <span className="material-symbols-outlined text-error text-sm">wifi_off</span>
                    <span className="text-[10px] font-mono text-error">{error}</span>
                </div>
            ) : (
                <>
                    <input
                        list={`models-${accentColor}`}
                        value={value}
                        onChange={e => onChange(e.target.value)}
                        placeholder="Type or select a local model..."
                        className={`w-full bg-surface-container-lowest border-b ${borderClass} py-2 font-mono text-sm text-on-surface cursor-text focus:outline-none transition-all`}
                    />
                    <datalist id={`models-${accentColor}`}>
                        {models.map(m => (
                            <option key={m.name} value={m.name} />
                        ))}
                    </datalist>
                </>
            )}
            {models.length > 0 && (
                <p className={`text-[9px] font-mono ${textClass} opacity-50 text-right mt-1`}>{models.length} model{models.length !== 1 ? 's' : ''} available locally</p>
            )}
        </div>
    );
};

const SettingsView = () => {
    const [agentA, setAgentA] = useState({ provider: 'ollama', model: '', hfModel: 'microsoft/Phi-3-mini-4k-instruct', temp: 0.8 });
    const [agentB, setAgentB] = useState({ provider: 'ollama', model: '', hfModel: 'Qwen/Qwen2.5-3B-Instruct', temp: 0.6 });
    const [maxSteps, setMaxSteps] = useState(12);
    const [complexity, setComplexity] = useState('LEVEL_02: ADVERSARIAL');
    const [saved, setSaved] = useState(false);

    useEffect(() => {
        const fetchConfig = async () => {
            try {
                const res = await fetch('http://localhost:7860/config');
                const data = await res.json();
                setAgentA({
                    provider: data.models.agent_a_provider || 'ollama',
                    model: data.models.agent_a,
                    hfModel: 'microsoft/Phi-3-mini-4k-instruct', // fallback
                    temp: data.models.agent_a_temp
                });
                setAgentB({
                    provider: data.models.agent_b_provider || 'ollama',
                    model: data.models.agent_b,
                    hfModel: 'Qwen/Qwen2.5-3B-Instruct',
                    temp: data.models.agent_b_temp
                });
                setMaxSteps(data.episode.max_steps);
            } catch (e) {
                console.error("Failed to fetch initial config", e);
            }
        };
        fetchConfig();
    }, []);

    const handleSave = async () => {
        try {
            await fetch('http://localhost:7860/config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    MAX_STEPS: maxSteps,
                    AGENT_A_MODEL: agentA.provider === 'ollama' ? agentA.model : agentA.hfModel,
                    AGENT_B_MODEL: agentB.provider === 'ollama' ? agentB.model : agentB.hfModel,
                    AGENT_A_PROVIDER: agentA.provider,
                    AGENT_B_PROVIDER: agentB.provider,
                    AGENT_A_TEMPERATURE: agentA.temp,
                    AGENT_B_TEMPERATURE: agentB.temp
                })
            });
            setSaved(true);
            setTimeout(() => setSaved(false), 2000);
        } catch (e) {
            console.error("Save failed", e);
        }
    };

    const ProviderToggle = ({ agent, agentId, onSetAgent }) => (
        <div className="flex gap-2 p-1 bg-surface-container-highest rounded-lg border border-white/5">
            {['ollama', 'hf'].map(p => (
                <button
                    key={p}
                    onClick={() => onSetAgent(a => ({...a, provider: p}))}
                    className={`flex-1 py-1 px-3 rounded text-[10px] font-mono font-bold uppercase transition-all ${agent.provider === p ? (agentId === 'A' ? 'bg-primary text-black' : 'bg-secondary text-black') : 'text-outline-variant hover:text-white'}`}
                >
                    {p === 'ollama' ? 'Local Ollama' : 'Hugging Face'}
                </button>
            ))}
        </div>
    );

    return (
        <div className="space-y-12 animate-in fade-in duration-500">
            <section className="flex flex-col md:flex-row justify-between items-end gap-6">
                <div className="max-w-2xl">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-1 h-6 bg-primary"></div>
                        <span className="font-mono text-xs tracking-[0.3em] text-primary uppercase">NEXUS_CORE_V2.0</span>
                    </div>
                    <h1 className="text-5xl font-headline font-bold text-on-surface tracking-tight leading-none mb-4 uppercase">
                        Settings <span className="text-primary/40">Configuration</span>
                    </h1>
                    <p className="text-on-surface-variant font-body leading-relaxed max-w-lg">
                        Calibrate the investigation environment for active agents. Adjust neural temperature, step limits, and procedural complexity.
                    </p>
                </div>
            </section>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
                {/* Agent A Config */}
                <div className="md:col-span-6 glass-panel rounded-xl p-8 relative overflow-hidden group refractive-edge">
                    <div className="flex items-center gap-4 mb-8">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center border border-primary/20">
                            <span className="material-symbols-outlined text-primary">smart_toy</span>
                        </div>
                        <div className="flex-1">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h3 className="font-headline text-xl font-bold uppercase">Agent A <span className="text-primary text-sm ml-2 tracking-tighter">[PRIMARY]</span></h3>
                                    <p className="font-mono text-[10px] text-slate-500 uppercase">Neural Processing Unit 01</p>
                                </div>
                                <ProviderToggle agent={agentA} agentId="A" onSetAgent={setAgentA} />
                            </div>
                        </div>
                    </div>
                    <div className="space-y-8">
                        {agentA.provider === 'ollama' ? (
                            <OllamaModelPicker
                                value={agentA.model}
                                onChange={v => setAgentA(a => ({ ...a, model: v }))}
                                accentColor="primary"
                            />
                        ) : (
                            <div className="space-y-2">
                                <label className="font-mono text-[10px] tracking-widest text-slate-400 uppercase">HF Model Repo ID</label>
                                <input
                                    className="w-full bg-transparent border-0 border-b border-primary/30 py-2 font-mono text-on-surface focus:outline-none focus:border-primary transition-all placeholder:text-slate-700"
                                    placeholder="e.g. microsoft/Phi-3-mini-4k-instruct"
                                    type="text"
                                    value={agentA.hfModel}
                                    onChange={e => setAgentA(a => ({ ...a, hfModel: e.target.value }))}
                                />
                            </div>
                        )}
                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <label className="font-mono text-[10px] tracking-widest text-slate-400 uppercase">Neural Temperature</label>
                                <span className="font-mono text-xs text-primary font-bold">{agentA.temp.toFixed(1)}</span>
                            </div>
                            <input
                                className="w-full h-1.5 rounded-lg appearance-none cursor-pointer accent-primary bg-surface-container-highest"
                                max="1" min="0" step="0.1" type="range"
                                value={agentA.temp}
                                onChange={e => setAgentA(a => ({ ...a, temp: parseFloat(e.target.value) }))}
                            />
                        </div>
                    </div>
                </div>

                {/* Agent B Config */}
                <div className="md:col-span-6 glass-panel rounded-xl p-8 relative overflow-hidden group refractive-edge">
                    <div className="flex items-center gap-4 mb-8">
                        <div className="w-10 h-10 rounded-lg bg-secondary/10 flex items-center justify-center border border-secondary/20">
                            <span className="material-symbols-outlined text-secondary">memory</span>
                        </div>
                        <div className="flex-1">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h3 className="font-headline text-xl font-bold uppercase">Agent B <span className="text-secondary text-sm ml-2 tracking-tighter">[SECONDARY]</span></h3>
                                    <p className="font-mono text-[10px] text-slate-500 uppercase">Logical Validation Unit 02</p>
                                </div>
                                <ProviderToggle agent={agentB} agentId="B" onSetAgent={setAgentB} />
                            </div>
                        </div>
                    </div>
                    <div className="space-y-8">
                        {agentB.provider === 'ollama' ? (
                            <OllamaModelPicker
                                value={agentB.model}
                                onChange={v => setAgentB(b => ({ ...b, model: v }))}
                                accentColor="secondary"
                            />
                        ) : (
                            <div className="space-y-2">
                                <label className="font-mono text-[10px] tracking-widest text-slate-400 uppercase">HF Model Repo ID</label>
                                <input
                                    className="w-full bg-transparent border-0 border-b border-secondary/30 py-2 font-mono text-on-surface focus:outline-none focus:border-secondary transition-all placeholder:text-slate-700"
                                    placeholder="e.g. Qwen/Qwen2.5-3B-Instruct"
                                    type="text"
                                    value={agentB.hfModel}
                                    onChange={e => setAgentB(b => ({ ...b, hfModel: e.target.value }))}
                                />
                            </div>
                        )}
                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <label className="font-mono text-[10px] tracking-widest text-slate-400 uppercase">Neural Temperature</label>
                                <span className="font-mono text-xs text-secondary font-bold">{agentB.temp.toFixed(1)}</span>
                            </div>
                            <input
                                className="w-full h-1.5 rounded-lg appearance-none cursor-pointer accent-secondary bg-surface-container-highest"
                                max="1" min="0" step="0.1" type="range"
                                value={agentB.temp}
                                onChange={e => setAgentB(b => ({ ...b, temp: parseFloat(e.target.value) }))}
                            />
                        </div>
                    </div>
                </div>

                {/* Environmental Parameters */}
                <div className="md:col-span-8 glass-panel rounded-xl p-8 refractive-edge">
                    <div className="flex items-center gap-4 mb-8">
                        <div className="w-10 h-10 rounded-lg bg-surface-container-highest flex items-center justify-center border border-white/5">
                            <span className="material-symbols-outlined text-on-surface-variant">settings_suggest</span>
                        </div>
                        <h3 className="font-headline text-xl font-bold uppercase tracking-tight">Environmental Parameters</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <label className="font-mono text-[10px] tracking-widest text-slate-400 uppercase">Max Inference Steps</label>
                                <div className="px-3 py-1 bg-primary/10 border border-primary/20 rounded font-mono text-sm text-primary font-bold min-w-[40px] text-center">{maxSteps}</div>
                            </div>
                            <input
                                className="w-full h-1.5 bg-surface-container-highest rounded-lg appearance-none cursor-pointer accent-primary"
                                max="16" min="4" step="1" type="range"
                                value={maxSteps}
                                onChange={e => setMaxSteps(parseInt(e.target.value))}
                            />
                        </div>
                        <div className="space-y-4">
                            <label className="font-mono text-[10px] tracking-widest text-slate-400 uppercase">Complexity Level</label>
                            <select
                                className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-lg px-4 py-3 appearance-none font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all text-on-surface cursor-pointer"
                                value={complexity}
                                onChange={e => setComplexity(e.target.value)}
                            >
                                <option>LEVEL_01: NOMINAL</option>
                                <option>LEVEL_02: ADVERSARIAL</option>
                                <option>LEVEL_03: CHAOS_SIM</option>
                                <option>LEVEL_04: BLACK_BOX</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Sync Status */}
                <div className="md:col-span-4 space-y-6">
                    <div className="glass-panel rounded-xl p-6 border-l-2 border-primary refractive-edge">
                        <h4 className="font-mono text-[10px] tracking-[0.2em] text-primary uppercase mb-4">Sync Status</h4>
                        <div className="space-y-2 font-mono text-[10px] text-slate-500 uppercase">
                            <p>Persistence: ACTIVE</p>
                            <p>Node: NY-SOC-04</p>
                            <p>Version: 2.0.4-STABLE</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="mt-12 flex flex-col md:flex-row items-center justify-between gap-6 py-10 border-t border-white/5">
                <div className="font-mono text-[10px] text-slate-500 uppercase tracking-tight">
                    System parameters are synchronized with NEXUS-CORE-API.
                </div>
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => { setAgentA(a => ({...a, model: '', provider: 'ollama'})); setAgentB(b => ({...b, model: '', provider: 'ollama'})); setMaxSteps(12); }}
                        className="px-8 py-3 bg-surface-container-high text-on-surface-variant font-headline font-bold text-sm tracking-widest rounded hover:bg-surface-container-highest hover:text-white transition-all uppercase"
                    >
                        Reset
                    </button>
                    <button
                        onClick={handleSave}
                        className={`px-10 py-3 font-headline font-bold text-sm tracking-[0.2em] rounded transition-all uppercase ${saved ? 'bg-tertiary/20 border border-tertiary text-tertiary' : 'bg-primary text-black hover:bg-primary/80'}`}
                    >
                        {saved ? '✓ Saved' : 'Save Changes'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SettingsView;
