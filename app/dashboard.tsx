"use client";

import {
  LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer
} from "recharts";
import { useState, useEffect } from "react";

function generatePoint(prev: number, min: number, max: number, step: number) {
  const next = prev + (Math.random() - 0.5) * step;
  return Math.min(max, Math.max(min, next));
}

const CHARTS = [
  { key: "hr",   label: "❤️ Fréquence cardiaque", subtitle: "Rythme cardiaque", unit: "bpm",  color: "#f72585", fill: "rgba(247,37,133,0.12)",  min: 50,  max: 110 },
  { key: "spo2", label: "🫁 Saturation en oxygène", subtitle: "SpO₂",          unit: "%",    color: "#06d6a0", fill: "rgba(6,214,160,0.12)",    min: 90,  max: 102 },
  { key: "bp",   label: "🩺 Pression artérielle",  subtitle: "Systolique",      unit: "mmHg", color: "#3b82f6", fill: "rgba(59,130,246,0.12)",   min: 80,  max: 170 },
  { key: "temp", label: "🌡️ Température corporelle", subtitle: "Température",   unit: "°C",   color: "#ffd166", fill: "rgba(255,209,102,0.12)",  min: 35,  max: 39  },
];

const STATS = [
  { key: "hr",   label: "Fréq. cardiaque", unit: "bpm",  color: "#f72585" },
  { key: "spo2", label: "Saturation O₂",   unit: "%",    color: "#06d6a0" },
  { key: "bp",   label: "Pression art.",   unit: "mmHg", color: "#3b82f6" },
  { key: "temp", label: "Température",     unit: "°C",   color: "#ffd166" },
];

const WINDOWS = [
  { label: "30 s",  value: 30  },
  { label: "1 min", value: 60  },
  { label: "2 min", value: 120 },
  { label: "5 min", value: 300 },
];

export default function Dashboard() {
  const [data, setData]         = useState<any[]>([]);
  const [tick, setTick]         = useState(0);
  const [window_, setWindow]    = useState(30);
  const [clock, setClock]       = useState("");
  const [hr,   setHr]           = useState(72);
  const [spo2, setSpo2]         = useState(98);
  const [bp,   setBp]           = useState(120);
  const [temp, setTemp]         = useState(37.1);

  // Tick every second
  useEffect(() => {
    const iv = setInterval(() => {
      setTick(t => t + 1);
      setHr(v   => +generatePoint(v, 55,  105,  2.4).toFixed(0));
      setSpo2(v => +generatePoint(v, 93,  100,  0.4).toFixed(1));
      setBp(v   => +generatePoint(v, 90,  160,  3  ).toFixed(0));
      setTemp(v => +generatePoint(v, 36,  38.5, 0.08).toFixed(1));
    }, 1000);
    return () => clearInterval(iv);
  }, []);

  // Append data point
  useEffect(() => {
    setData(d => [...d, { t: `${tick}s`, hr, spo2, bp, temp }].slice(-300));
  }, [tick]);

  // Clock
  useEffect(() => {
    const iv = setInterval(() => setClock(new Date().toLocaleTimeString("fr-FR")), 1000);
    setClock(new Date().toLocaleTimeString("fr-FR"));
    return () => clearInterval(iv);
  }, []);

  const sliced = data.slice(-window_);
  const latest: any = data[data.length - 1] || {};

  const s = {
    header: { position: "relative" as const, zIndex: 10, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 40px", borderBottom: "1px solid rgba(56,139,253,0.15)", background: "rgba(8,14,26,0.85)", backdropFilter: "blur(12px)" } as React.CSSProperties,
    logo: { display: "flex", alignItems: "center", gap: "12px" },
    logoIcon: { width: 36, height: 36, background: "linear-gradient(135deg,#3b82f6,#06d6a0)", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 },
    logoText: { fontSize: 20, fontWeight: 700, letterSpacing: "-0.5px" },
    patientBadge: { background: "#0d1628", border: "1px solid rgba(56,139,253,0.15)", borderRadius: 10, padding: "8px 16px", fontSize: 13, color: "#5b7aa8" },
    liveBadge: { display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontFamily: "'DM Mono', monospace", color: "#06d6a0" },
    liveDot: { width: 8, height: 8, background: "#06d6a0", borderRadius: "50%", animation: "pulse 1.5s ease-in-out infinite" },
    main: { position: "relative" as const, zIndex: 5, padding: "32px 40px", display: "flex", flexDirection: "column" as const, gap: 28 },
    statsRow: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px,1fr))", gap: 16 },
    statCard: { background: "#0d1628", border: "1px solid rgba(56,139,253,0.15)", borderRadius: 16, padding: "20px 24px", display: "flex", flexDirection: "column" as const, gap: 8 },
    controls: { display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" as const },
    chartsGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px,1fr))", gap: 20 },
    chartCard: { background: "#0d1628", border: "1px solid rgba(56,139,253,0.15)", borderRadius: 20, padding: 24, display: "flex", flexDirection: "column" as const, gap: 16 },
    footer: { position: "relative" as const, zIndex: 5, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 40px", borderTop: "1px solid rgba(56,139,253,0.15)", fontSize: 12, color: "#5b7aa8", fontFamily: "'DM Mono', monospace" },
  };

  return (
    <>
      <style>{`
        @keyframes pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.4;transform:scale(.8)} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        .stat-card { animation: fadeUp .5s ease both; transition: border-color .3s, transform .3s; }
        .stat-card:hover { border-color: rgba(56,139,253,0.4) !important; transform: translateY(-2px); }
        .chart-card { animation: fadeUp .6s ease both; transition: border-color .3s; }
        .chart-card:hover { border-color: rgba(56,139,253,0.35) !important; }
        .filter-btn { background:#0d1628; border:1px solid rgba(56,139,253,0.15); color:#5b7aa8; border-radius:8px; padding:8px 16px; font-size:13px; font-family:'Sora',sans-serif; cursor:pointer; transition:all .2s; }
        .filter-btn:hover, .filter-btn.active { background:#3b82f6; border-color:#3b82f6; color:white; }
      `}</style>

      {/* Header */}
      <header style={s.header}>
        <div style={s.logo}>
          <div style={s.logoIcon}>🫀</div>
          <div style={s.logoText}>Medi<span style={{ color: "#06d6a0" }}>Chart</span></div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <div style={s.patientBadge}>Patient : <strong style={{ color: "#e2eaf8" }}>Dupont, Jean</strong> — ID #4821</div>
          <div style={s.liveBadge}><div style={s.liveDot} /><span>LIVE</span></div>
        </div>
      </header>

      {/* Main */}
      <main style={s.main}>

        {/* Stats */}
        <div style={s.statsRow}>
          {STATS.map(st => (
            <div key={st.key} className="stat-card" style={s.statCard}>
              <div style={{ fontSize: 12, color: "#5b7aa8", textTransform: "uppercase", letterSpacing: 1, fontWeight: 600 }}>{st.label}</div>
              <div style={{ fontSize: 32, fontWeight: 700, fontFamily: "'DM Mono',monospace", color: st.color, lineHeight: 1 }}>
                {latest[st.key] ?? "—"} <span style={{ fontSize: 14, color: "#5b7aa8", fontWeight: 400 }}>{st.unit}</span>
              </div>
              <div style={{ fontSize: 12, color: "#5b7aa8", fontFamily: "'DM Mono',monospace" }}>↔ Stable</div>
            </div>
          ))}
        </div>

        {/* Window controls */}
        <div style={s.controls}>
          <span style={{ fontSize: 13, color: "#5b7aa8", fontWeight: 600, textTransform: "uppercase", letterSpacing: 1 }}>Fenêtre :</span>
          {WINDOWS.map(w => (
            <button key={w.value} className={`filter-btn${window_ === w.value ? " active" : ""}`} onClick={() => setWindow(w.value)}>
              {w.label}
            </button>
          ))}
        </div>

        {/* Charts */}
        <div style={s.chartsGrid}>
          {CHARTS.map(c => (
            <div key={c.key} className="chart-card" style={s.chartCard}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 15 }}>{c.label}</div>
                  <div style={{ color: "#5b7aa8", fontSize: 12, marginTop: 2 }}>{c.subtitle} — {c.unit}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 24, fontWeight: 700, fontFamily: "'DM Mono',monospace", color: c.color }}>
                    {latest[c.key] ?? "—"}
                  </div>
                  <div style={{ fontSize: 11, color: "#5b7aa8" }}>{c.unit} actuel</div>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={sliced}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(56,139,253,0.06)" />
                  <XAxis dataKey="t" tick={{ fill: "#5b7aa8", fontSize: 10, fontFamily: "'DM Mono',monospace" }} />
                  <YAxis domain={[c.min, c.max]} tick={{ fill: "#5b7aa8", fontSize: 10, fontFamily: "'DM Mono',monospace" }} />
                  <Tooltip contentStyle={{ background: "#0d1628", border: "1px solid rgba(56,139,253,0.3)", color: "#e2eaf8", fontFamily: "'DM Mono',monospace" }} />
                  <defs>
                    <linearGradient id={`fill-${c.key}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={c.color} stopOpacity={0.2} />
                      <stop offset="95%" stopColor={c.color} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Line type="monotone" dataKey={c.key} stroke={c.color} strokeWidth={2} dot={false} isAnimationActive={false} fill={`url(#fill-${c.key})`} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer style={s.footer}>
        <span>MediChart v1.0</span>
        <span>{clock}</span>
        <span>Données simulées</span>
      </footer>
    </>
  );
}