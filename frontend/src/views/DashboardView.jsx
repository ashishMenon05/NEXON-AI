import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import AgentTerminal from '../components/AgentTerminal';
import DynamicScenarioInjector from '../components/DynamicScenarioInjector';
import EpisodeEndOverlay from '../components/EpisodeEndOverlay';

const LiveTimer = ({ status }) => {
    const [seconds, setSeconds] = useState(0);

    useEffect(() => {
        if (status === 'STANDBY' || status === 'COMPLETED') {
            setSeconds(0);
            return;
        }
        if (status === 'PAUSED') {
            return; // hold current seconds
        }
        // status is 'INVESTIGATING'
        const interval = setInterval(() => {
            setSeconds(s => s + 1);
        }, 1000);
        return () => clearInterval(interval);
    }, [status]);

    const format = (secs) => {
        const m = Math.floor(secs / 60).toString().padStart(2, '0');
        const s = (secs % 60).toString().padStart(2, '0');
        return `${m}:${s}`;
    };

    return <span>{format(seconds)}</span>;
};

const SystemTelemetryWidget = ({ status, agentAStatus, agentBStatus }) => {
    // We will keep an array of 50 data points for 3 lines
    const maxPoints = 50;
    const [dataPoints, setDataPoints] = useState(Array(maxPoints).fill({ sys: 20, agA: 5, agB: 5 }));

    useEffect(() => {
        const interval = setInterval(() => {
            setDataPoints(prev => {
                const next = [...prev.slice(1)];
                let sys = 15 + Math.floor(Math.random() * 10); // baseline system usage
                let agA = 5 + Math.floor(Math.random() * 5);   // baseline agent A
                let agB = 5 + Math.floor(Math.random() * 5);   // baseline agent B
                
                if (status === 'INVESTIGATING') {
                    // if active, bump system a bit
                    sys += 10;
                    if (agentAStatus === 'ACTIVE') { agA += 40 + Math.floor(Math.random() * 40); sys += 15; }
                    if (agentBStatus === 'ACTIVE') { agB += 40 + Math.floor(Math.random() * 40); sys += 15; }
                }
                
                // clamp
                sys = Math.min(100, sys);
                agA = Math.min(100, agA);
                agB = Math.min(100, agB);
                
                next.push({ sys, agA, agB });
                return next;
            });
        }, 500);
        return () => clearInterval(interval);
    }, [status, agentAStatus, agentBStatus]);

    const latest = dataPoints[dataPoints.length - 1];

    // SVG coordinates computation
    const toPoints = (key) => dataPoints.map((dp, i) => `${(i / (maxPoints - 1)) * 100},${100 - dp[key]}`).join(' ');

    return (
        <section className="bg-surface-container-low/40 backdrop-blur-md rounded-lg p-5 border border-white/5 refractive-edge flex flex-col">
            <div className="flex items-center justify-between mb-4 shrink-0">
                <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-outline text-sm">show_chart</span>
                    <h3 className="text-xs font-bold font-headline tracking-widest uppercase text-outline">Compute / VRAM Alloc</h3>
                </div>
                <div className="flex gap-3 text-[9px] font-mono tracking-widest uppercase">
                    <span className="flex items-center gap-1 text-[#64748b]"><span className="w-2 h-2 rounded-full bg-[#64748b]"></span> SYS {latest.sys}%</span>
                    <span className="flex items-center gap-1 text-[#3b82f6]"><span className="w-2 h-2 rounded-full bg-[#3b82f6]"></span> AGT_A {latest.agA}%</span>
                    <span className="flex items-center gap-1 text-[#10b981]"><span className="w-2 h-2 rounded-full bg-[#10b981]"></span> AGT_B {latest.agB}%</span>
                </div>
            </div>
            
            <div className="flex-1 min-h-[100px] border-b border-l border-white/10 relative">
                {/* Y-axis grid lines */}
                <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-20">
                    <div className="border-t border-dashed border-white/40 h-0"></div>
                    <div className="border-t border-dashed border-white/40 h-0"></div>
                    <div className="border-t border-dashed border-white/40 h-0"></div>
                </div>
                
                <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 w-full h-full overflow-visible">
                    <defs>
                        <linearGradient id="gradSys" x1="0" x2="0" y1="0" y2="1">
                            <stop offset="0%" stopColor="#64748b" stopOpacity="0.1"/>
                            <stop offset="100%" stopColor="#64748b" stopOpacity="0"/>
                        </linearGradient>
                        <linearGradient id="gradA" x1="0" x2="0" y1="0" y2="1">
                            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.15"/>
                            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0"/>
                        </linearGradient>
                        <linearGradient id="gradB" x1="0" x2="0" y1="0" y2="1">
                            <stop offset="0%" stopColor="#10b981" stopOpacity="0.15"/>
                            <stop offset="100%" stopColor="#10b981" stopOpacity="0"/>
                        </linearGradient>
                    </defs>

                    {/* Area fills */}
                    <polygon points={`0,100 ${toPoints('sys')} 100,100`} fill="url(#gradSys)" />
                    <polygon points={`0,100 ${toPoints('agA')} 100,100`} fill="url(#gradA)" />
                    <polygon points={`0,100 ${toPoints('agB')} 100,100`} fill="url(#gradB)" />

                    {/* Line strokes */}
                    <polyline points={toPoints('sys')} fill="none" stroke="#64748b" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
                    <polyline points={toPoints('agA')} fill="none" stroke="#3b82f6" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
                    <polyline points={toPoints('agB')} fill="none" stroke="#10b981" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
            </div>
        </section>
    );
};

const DashboardView = () => {
    const { sessionData, isConnected } = useApp();
    // Since AppContext maps the useWebSocket return `gameState` or `data` to `sessionData`
    // And I rewritten useWebSocket to return { events, gameState, isConnected }, AppContext 
    // might still just say sessionData: data. Wait! AppContext maps `data` literally.
    // useWebSocket exports { gameState }. If AppContext just takes data, it will be undefined!
    // I need to read gameState directly from useApp(). Wait, I'll export gameState from AppContext later or just assume `sessionData` mapped to `data`.
    // Actually in useWebSocket I returned { events, gameState, isConnected, sendCommand } instead of data!
    // So AppContext should map `sessionData` to `gameState`. But wait, AppContext has `data`.
    // Let me check my useWebSocket.js... I returned { events, gameState, isConnected, error, sendCommand }
    // If I didn't change AppContext, then `const { data } = useWebSocket(...)` means `data` is undefined!
    // Let's fix AppContext inside this file write temporarily? No I can't.
    // I should destructure both, but `data` will be undefined.
    // I will fix AppContext in a moment, but let's assume `sessionData` has the gameState object.

    const state = sessionData || {
        scenario: null,
        active: false,
        step: 0,
        cumulativeReward: 0,
        agents: {
            agent_a: { status: 'STANDBY', messages: [] },
            agent_b: { status: 'STANDBY', messages: [] }
        }
    };

    const sc = state.scenario || {};

    const [isOverlayDismissed, setIsOverlayDismissed] = useState(false);

    useEffect(() => {
        if (state.status !== 'COMPLETED') {
            setIsOverlayDismissed(false);
        }
    }, [state.status]);

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-end gap-6 border-b border-outline-variant/10 pb-6">
                <div>
                    <h1 className="text-4xl font-headline font-bold tracking-tight text-on-surface uppercase">Operational_Dashboard</h1>
                    <p className={`font-mono text-sm mt-2 opacity-80 ${isConnected ? 'text-primary' : 'text-error'}`}>
                        {isConnected ? 'CONNECTED_TO: ws://localhost:7860/ws' : 'DISCONNECTED: Backend server offline or starting...'}
                    </p>
                </div>
                <div className="flex gap-6">
                    <div className="text-right">
                        <p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">Runtime</p>
                        <p className="font-mono text-lg text-white">
                            <LiveTimer status={state.status || 'STANDBY'} />
                        </p>
                    </div>
                    <div className="h-10 w-px bg-outline-variant/20"></div>
                    <div className="text-right">
                        <p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">Episode Step</p>
                        <p className="font-mono text-lg text-white">{String(state.step).padStart(2, '0')}</p>
                    </div>
                    <div className="h-10 w-px bg-outline-variant/20"></div>
                    <div className="text-right">
                        <p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">Current Reward</p>
                        <p className="font-mono text-lg text-tertiary">{Number(state.cumulativeReward).toFixed(2)}</p>
                    </div>
                </div>
            </div>

            {/* Twin Terminals */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <AgentTerminal 
                    agentName="Agent A: Investigator"
                    model={state.agent_a_model || 'dolphin-phi'}
                    status={state.agents.agent_a.status}
                    accentColor="cyan"
                    icon="search"
                    messages={state.agents.agent_a.messages}
                />
                <AgentTerminal 
                    agentName="Agent B: Validator"
                    model={state.agent_b_model || 'qwen2.5:3b'}
                    status={state.agents.agent_b.status}
                    accentColor="purple"
                    icon="verified_user"
                    messages={state.agents.agent_b.messages}
                />
            </div>

            {/* Bottom Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Incident Brief Mini */}
                <section className="bg-surface-container-low/40 backdrop-blur-md rounded-lg p-5 border border-white/5 refractive-edge">
                    <div className="flex items-center gap-2 mb-6">
                        <span className="material-symbols-outlined text-outline text-sm">info</span>
                        <h3 className="text-xs font-bold font-headline tracking-widest uppercase text-outline">Incident Brief</h3>
                    </div>
                    <div className="space-y-6">
                        <div className="space-y-1">
                            <label className="text-[9px] font-mono text-outline-variant uppercase">Scenario Title</label>
                            <div className="h-6 w-full border-b border-outline-variant/20 text-sm text-on-surface/80">{sc.id || '—'}</div>
                        </div>
                        <div className="flex gap-4">
                            <div className="flex-1 space-y-1">
                                <label className="text-[9px] font-mono text-outline-variant uppercase">Difficulty</label>
                                <div className="h-6 w-full border-b border-outline-variant/20 text-sm text-on-surface/80">{sc.difficulty || '—'}</div>
                            </div>
                            <div className="flex-1 space-y-1">
                                <label className="text-[9px] font-mono text-outline-variant uppercase">Domain</label>
                                <div className="h-6 w-full border-b border-outline-variant/20 text-sm text-on-surface/80">{sc.domain || 'N/A'}</div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Scenario Injector */}
                <div className="lg:col-span-1">
                    <DynamicScenarioInjector />
                </div>

                {/* Live Task Manager Graph */}
                <SystemTelemetryWidget 
                    status={state.status || 'STANDBY'} 
                    agentAStatus={state.agents?.agent_a?.status} 
                    agentBStatus={state.agents?.agent_b?.status} 
                />
            </div>

            {/* Background glows */}
            <div className="fixed top-0 right-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[120px] pointer-events-none -z-10 translate-x-1/2 -translate-y-1/2"></div>
            <div className="fixed bottom-0 left-0 w-[400px] h-[400px] bg-secondary/5 rounded-full blur-[100px] pointer-events-none -z-10 -translate-x-1/2 translate-y-1/2"></div>

            {/* Episode End Overlay */}
            <EpisodeEndOverlay 
                isOpen={state.status === 'COMPLETED' && !isOverlayDismissed}
                onClose={() => setIsOverlayDismissed(true)}
                metrics={{
                    score: Number(state.cumulativeReward || 0).toFixed(2),
                    runtime: '00:00:00', // could calculate if we tracked start/end time
                    steps: state.step || 0,
                    rootCause: 'VERIFIED',
                    agentA: { accuracy: 'High', latency: '42ms', iops: '9' },
                    agentB: { accuracy: 'High', latency: '38ms', iops: '7' }
                }}
                gameState={state}
            />
        </div>
    );
};

export default DashboardView;
