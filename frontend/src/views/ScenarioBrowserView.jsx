import React, { useState } from 'react';

const ALL_SCENARIOS = [
    {
        id: 1,
        title: 'GHOST LINK INFILTRATION',
        domain: 'NETWORK',
        difficulty: 'LEVEL 4',
        difficultyNum: 4,
        description: 'Decrypt encrypted command-and-control channels within an enterprise mesh network.',
        accent: 'primary',
        icon: 'shield',
        tag: 'CRITICAL'
    },
    {
        id: 2,
        title: 'ORACLE BREACH TRACE',
        domain: 'DATABASE',
        difficulty: 'LEVEL 2',
        difficultyNum: 2,
        description: 'Perform forensic analysis on a SQL injection attempt. Identify exfiltrated datasets.',
        accent: 'secondary',
        icon: 'database',
        tag: 'COMPLIANCE'
    },
    {
        id: 3,
        title: 'NEBULA API COLLAPSE',
        domain: 'CLOUD FRAMEWORK',
        difficulty: 'LEVEL 5',
        difficultyNum: 5,
        description: 'Massive service degradation across regional clusters. Investigate DDoS vs Zero-Day.',
        accent: 'primary',
        icon: 'cloud',
        tag: null
    },
    {
        id: 4,
        title: 'PHANTOM CREDENTIAL HARVEST',
        domain: 'IDENTITY',
        difficulty: 'LEVEL 3',
        difficultyNum: 3,
        description: 'Trace a credential stuffing attack across microservices. Recover compromised tokens.',
        accent: 'secondary',
        icon: 'fingerprint',
        tag: 'CRITICAL'
    },
    {
        id: 5,
        title: 'SILENT EXFIL TRACE',
        domain: 'ENDPOINT',
        difficulty: 'LEVEL 4',
        difficultyNum: 4,
        description: 'Detect anomalous data outflow from a compromised workstation. Time is critical.',
        accent: 'primary',
        icon: 'leak_remove',
        tag: 'COMPLIANCE'
    }
];

const FILTERS = ['ALL', 'CRITICAL', 'COMPLIANCE'];

const ScenarioBrowserView = () => {
    const [activeFilter, setActiveFilter] = useState('ALL');
    const [sortBy, setSortBy] = useState('id');

    const injectScenario = async (scenario) => {
        try {
            await fetch("http://localhost:7860/reset", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    task: "custom-incident",
                    custom_scenario: {
                        id: `id_${Date.now()}`,
                        description: `[${scenario.title}] ${scenario.description}`,
                        context: `Domain: ${scenario.domain}`,
                        difficulty: "medium",
                        clue_map: {}
                    }
                })
            });
            window.location.hash = '#';
        } catch (e) {
            console.error("Failed to inject", e);
        }
    };

    const filtered = ALL_SCENARIOS
        .filter(s => activeFilter === 'ALL' || s.tag === activeFilter)
        .sort((a, b) => sortBy === 'difficulty' ? b.difficultyNum - a.difficultyNum : a.id - b.id);

    const accentClasses = {
        primary: { text: 'text-primary', bg: 'bg-primary/10', border: 'border-primary/20' },
        secondary: { text: 'text-secondary', bg: 'bg-secondary/10', border: 'border-secondary/20' },
    };

    return (
        <div className="space-y-10 animate-in fade-in duration-500">
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div className="space-y-2">
                    <div className="flex items-center gap-2 text-primary font-mono text-[10px] tracking-[0.2em] uppercase">
                        <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
                        Scenario Registry v2.4 — {filtered.length} results
                    </div>
                    <h1 className="text-4xl font-headline font-bold text-on-surface tracking-tight uppercase">Nexus Scenario Browser</h1>
                    <p className="text-on-surface-variant max-w-xl text-sm leading-relaxed">
                        Select a tactical simulation to begin intelligence harvesting. Each scenario represents a live threat vector mapped to neural defense protocols.
                    </p>
                </div>

                <div className="flex flex-col gap-3 items-end">
                    {/* Filter Pills */}
                    <div className="flex items-center gap-1 bg-surface-container-lowest p-1 rounded border border-white/5">
                        {FILTERS.map(f => (
                            <button
                                key={f}
                                onClick={() => setActiveFilter(f)}
                                className={`px-4 py-1.5 text-[10px] font-mono tracking-widest rounded-sm transition-all ${activeFilter === f
                                        ? 'bg-primary text-black font-bold'
                                        : 'text-on-surface-variant hover:text-on-surface'
                                    }`}
                            >
                                {f}
                            </button>
                        ))}
                    </div>
                    {/* Sort */}
                    <div className="flex items-center gap-2">
                        <span className="text-[9px] font-mono text-slate-600 uppercase">Sort:</span>
                        <button
                            onClick={() => setSortBy('id')}
                            className={`text-[9px] font-mono px-2 py-0.5 rounded transition-all ${sortBy === 'id' ? 'text-primary' : 'text-slate-600 hover:text-slate-400'}`}
                        >
                            Default
                        </button>
                        <button
                            onClick={() => setSortBy('difficulty')}
                            className={`text-[9px] font-mono px-2 py-0.5 rounded transition-all ${sortBy === 'difficulty' ? 'text-primary' : 'text-slate-600 hover:text-slate-400'}`}
                        >
                            Hardest First
                        </button>
                    </div>
                </div>
            </header>

            {filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 text-center">
                    <span className="material-symbols-outlined text-outline-variant/40 text-5xl mb-3">filter_list_off</span>
                    <p className="font-mono text-sm text-outline-variant uppercase">No scenarios match the filter</p>
                    <button onClick={() => setActiveFilter('ALL')} className="mt-4 text-[10px] font-mono text-primary hover:underline">Clear filter</button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filtered.map((s) => {
                        const ac = accentClasses[s.accent] || accentClasses.primary;
                        return (
                            <div key={s.id} className="glass-panel group flex flex-col transition-all duration-300 hover:ring-2 hover:ring-primary/20 rounded-lg overflow-hidden">
                                <div className="relative h-36 w-full bg-surface-container-highest overflow-hidden flex items-center justify-center">
                                    <div className="absolute inset-0 bg-gradient-to-t from-surface via-transparent to-transparent z-10"></div>
                                    <div className={`absolute inset-0 ${ac.bg} opacity-30 group-hover:opacity-60 transition-opacity`}></div>
                                    <span className={`material-symbols-outlined text-5xl ${ac.text} opacity-20 group-hover:opacity-40 transition-opacity`}>{s.icon}</span>
                                    {s.tag && (
                                        <div className={`absolute top-3 right-3 backdrop-blur-md px-2 py-0.5 rounded-sm z-20 border ${s.tag === 'CRITICAL' ? 'bg-error/20 border-error/30' : 'bg-tertiary/20 border-tertiary/30'
                                            }`}>
                                            <span className={`text-[9px] font-mono font-bold tracking-widest uppercase ${s.tag === 'CRITICAL' ? 'text-error' : 'text-tertiary'}`}>{s.tag}</span>
                                        </div>
                                    )}
                                </div>
                                <div className="p-6 flex flex-col flex-1 space-y-4">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <div className={`text-[10px] font-mono ${ac.text} tracking-widest mb-1 uppercase`}>{s.domain}</div>
                                            <h3 className="text-lg font-headline font-bold text-on-surface leading-tight">{s.title}</h3>
                                        </div>
                                        <div className={`px-2 py-1 rounded ${ac.bg} border ${ac.border}`}>
                                            <div className={`text-xs font-mono font-bold ${ac.text}`}>{s.difficultyNum}/5</div>
                                        </div>
                                    </div>
                                    <p className="text-sm text-on-surface-variant flex-1 line-clamp-2">{s.description}</p>
                                    <div className="pt-4 border-t border-outline-variant/10 flex items-center justify-between">
                                        <div className="font-mono text-[9px] text-slate-600 uppercase">{s.difficulty}</div>
                                        <button onClick={() => injectScenario(s)} className={`flex items-center gap-1.5 text-[10px] font-mono font-bold tracking-widest ${ac.text} hover:text-white transition-colors`}>
                                            SELECT SCENARIO
                                            <span className="material-symbols-outlined text-xs">arrow_forward</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default ScenarioBrowserView;
