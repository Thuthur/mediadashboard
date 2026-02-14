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

export default function Dashboard() {
  const [data, setData] = useState<any[]>([]);
  const [tick, setTick] = useState(0);
  const [hr, setHr] = useState(72);
  const [spo2, setSpo2] = useState(98);
  const [bp, setBp] = useState(120);
  const [temp, setTemp] = useState(37.1);

  useEffect(() => {
    const interval = setInterval(() => {
      setTick(t => t + 1);
      setHr(v => { const n = generatePoint(v, 55, 105, 2.4); return +n.toFixed(0); });
      setSpo2(v => { const n = generatePoint(v, 93, 100, 0.4); return +n.toFixed(1); });
      setBp(v => { const n = generatePoint(v, 90, 160, 3); return +n.toFixed(0); });
      setTemp(v => { const n = generatePoint(v, 36, 38.5, 0.08); return +n.toFixed(1); });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    setData(d => {
      const next = [...d, { t: `${tick}s`, hr, spo2, bp, temp }];
      return next.slice(-30);
    });
  }, [tick]);

  const charts = [
    { key: "hr",   label: "❤️ Fréquence cardiaque", unit: "bpm",  color: "#f72585", value: hr,   min: 50,  max: 110 },
    { key: "spo2", label: "🫁 Saturation O₂",        unit: "%",    color: "#06d6a0", value: spo2, min: 90,  max: 102 },
    { key: "bp",   label: "🩺 Pression artérielle",  unit: "mmHg", color: "#3b82f6", value: bp,   min: 80,  max: 170 },
    { key: "temp", label: "🌡️ Température",           unit: "°C",   color: "#ffd166", value: temp, min: 35,  max: 39  },
  ];

  return (
    <div style={{ background: "#080e1a", minHeight: "100vh", padding: "32px", color: "#e2eaf8", fontFamily: "sans-serif" }}>
      <h1 style={{ fontSize: "24px", fontWeight: "700", marginBottom: "32px" }}>
        🫀 MediChart — <span style={{ color: "#06d6a0" }}>Tableau de bord</span>
      </h1>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
        {charts.map(c => (
          <div key={c.key} style={{ background: "#0d1628", border: "1px solid rgba(56,139,253,0.15)", borderRadius: "16px", padding: "24px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
              <div>
                <div style={{ fontWeight: "600", fontSize: "15px" }}>{c.label}</div>
                <div style={{ color: "#5b7aa8", fontSize: "12px", marginTop: "2px" }}>{c.unit}</div>
              </div>
              <div style={{ fontSize: "28px", fontWeight: "700", color: c.color, fontFamily: "monospace" }}>
                {c.value} <span style={{ fontSize: "14px", color: "#5b7aa8" }}>{c.unit}</span>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(56,139,253,0.06)" />
                <XAxis dataKey="t" tick={{ fill: "#5b7aa8", fontSize: 10 }} />
                <YAxis domain={[c.min, c.max]} tick={{ fill: "#5b7aa8", fontSize: 10 }} />
                <Tooltip contentStyle={{ background: "#0d1628", border: "1px solid rgba(56,139,253,0.3)", color: "#e2eaf8" }} />
                <Line type="monotone" dataKey={c.key} stroke={c.color} strokeWidth={2} dot={false} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ))}
      </div>
    </div>
  );
}