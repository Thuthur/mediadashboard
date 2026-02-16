"use client";

import { useState, useCallback } from "react";
import * as XLSX from "xlsx";
import {
  LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ReferenceArea
} from "recharts";

// ─── Types ───────────────────────────────────────────
interface FileData {
  name: string;
  columns: string[];
  rows: Record<string, number>[];
}

interface Group {
  label: string;
  columns: string[];
}

// ─── Couleurs pour les courbes ───────────────────────
const COLORS = [
  "#f72585","#06d6a0","#3b82f6","#ffd166",
  "#a855f7","#ff6b35","#00b4d8","#95d5b2",
  "#e63946","#457b9d","#2ec4b6","#ff9f1c",
];

// ─── Détecte si une colonne est un indicateur principal
function isMainIndicator(col: string): boolean {
  return !!(col.match(/^Indicateur\d+$/i) || col === "CHARGE_TOTALE");
}

// ─── Groupement des colonnes par indicateur ──────────
function groupColumns(columns: string[]): Group[] {
  const groups: Group[] = [];

  const standalone = columns.filter(col => {
    const isIndicateur = col.match(/^Indicateur\d+$/i) || col === "CHARGE_TOTALE";
    const isTache = col.match(/Indicateur\d+/i) && col.match(/Tache/i);
    return !isIndicateur && !isTache;
  });

  if (standalone.length > 0) {
    groups.push({ label: "Général", columns: standalone });
  }

  const indicateurs = columns.filter(col => col.match(/^Indicateur\d+$/i));

  indicateurs.forEach(ind => {
    const taches = columns.filter(col =>
      col !== ind && col.toLowerCase().includes(ind.toLowerCase())
    );
    groups.push({
      label: ind.toUpperCase(),
      columns: [ind, ...taches],
    });
  });

  return groups;
}

export default function PerformanceDashboard() {
  const [files, setFiles]           = useState<FileData[]>([]);
  const [selected, setSelected]     = useState<Record<string, boolean>>({});
  const [chartData, setChartData]   = useState<Record<string, number>[]>([]);

  // ─── Zoom state ───────────────────────────────────
  const [refAreaLeft, setRefAreaLeft]   = useState<number | null>(null);
  const [refAreaRight, setRefAreaRight] = useState<number | null>(null);
  const [isSelecting, setIsSelecting]   = useState(false);
  const [zoomLeft, setZoomLeft]         = useState<number | null>(null);
  const [zoomRight, setZoomRight]       = useState<number | null>(null);

  // ─── Données affichées (avec zoom) ───────────────
  const displayedData = chartData.filter(row => {
    if (zoomLeft === null || zoomRight === null) return true;
    return row.Temps >= zoomLeft && row.Temps <= zoomRight;
  });

  // ─── Reconstruction des données du graphique ──────
  const rebuildChartData = (
    allFiles: FileData[],
    sel: Record<string, boolean>
  ) => {
    if (allFiles.length === 0) return;
    const timeMap: Record<number, Record<string, number>> = {};
    allFiles.forEach(file => {
      file.rows.forEach(row => {
        const t = row["Temps"];
        if (!timeMap[t]) timeMap[t] = { Temps: t };
        file.columns.forEach(col => {
          const key = `${file.name}__${col}`;
          timeMap[t][key] = row[col];
        });
      });
    });
    const merged = Object.values(timeMap).sort((a, b) => a.Temps - b.Temps);
    setChartData(merged);
  };

  // ─── Lecture du fichier Excel ─────────────────────
  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFiles = Array.from(e.target.files || []);
    uploadedFiles.forEach(file => {
      const reader = new FileReader();
      reader.onload = (evt) => {
        const data = evt.target?.result;
        const workbook = XLSX.read(data, { type: "binary" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const json: any[] = XLSX.utils.sheet_to_json(sheet);
        const columns = Object.keys(json[0]).filter(
          col => col !== "Numéro de mesure" && col !== "Heure programme"
        );
        const rows = json.map(row => {
          const cleaned: Record<string, number> = {
            Temps: parseFloat(String(row["Heure programme"]).replace(",", ".")),
          };
          columns.forEach(col => {
            cleaned[col] = parseFloat(String(row[col]).replace(",", "."));
          });
          return cleaned;
        });
        const newFile: FileData = { name: file.name, columns, rows };
        setFiles(prev => {
          const updated = [...prev, newFile];
          rebuildChartData(updated, selected);
          return updated;
        });
      };
      reader.readAsBinaryString(file);
    });
  }, [selected]);

  // ─── Sélection / désélection d'une courbe ─────────
  const toggleColumn = (key: string) => {
    setSelected(prev => {
      const updated = { ...prev, [key]: !prev[key] };
      rebuildChartData(files, updated);
      return updated;
    });
  };

  // ─── Tout sélectionner / désélectionner un groupe ─
  const toggleGroup = (fileName: string, cols: string[]) => {
    setSelected(prev => {
      const keys = cols.map(c => `${fileName}__${c}`);
      const allC = keys.every(k => prev[k]);
      const updated = { ...prev };
      keys.forEach(k => { updated[k] = !allC; });
      rebuildChartData(files, updated);
      return updated;
    });
  };

  // ─── Tout sélectionner / désélectionner ───────────
  const toggleAll = () => {
    setSelected(prev => {
      const keys = files.flatMap(f => f.columns.map(c => `${f.name}__${c}`));
      const allC = keys.every(k => prev[k]);
      const updated = { ...prev };
      keys.forEach(k => { updated[k] = !allC; });
      rebuildChartData(files, updated);
      return updated;
    });
  };

  // ─── Gestion du zoom souris ───────────────────────
  const handleMouseDown = (e: any) => {
    if (!e || !e.activeLabel) return;
    setRefAreaLeft(parseFloat(e.activeLabel));
    setIsSelecting(true);
  };

  const handleMouseMove = (e: any) => {
    if (!isSelecting || !e || !e.activeLabel) return;
    setRefAreaRight(parseFloat(e.activeLabel));
  };

  const handleMouseUp = () => {
    if (!isSelecting || refAreaLeft === null || refAreaRight === null) {
      setIsSelecting(false);
      return;
    }
    const left  = Math.min(refAreaLeft, refAreaRight);
    const right = Math.max(refAreaLeft, refAreaRight);
    if (left !== right) {
      setZoomLeft(left);
      setZoomRight(right);
    }
    setRefAreaLeft(null);
    setRefAreaRight(null);
    setIsSelecting(false);
  };

  const handleDoubleClick = () => {
    setZoomLeft(null);
    setZoomRight(null);
    setRefAreaLeft(null);
    setRefAreaRight(null);
    setIsSelecting(false);
  };

  // ─── Stats pour les coches globales ───────────────
  const allKeys = files.flatMap(f => f.columns.map(c => `${f.name}__${c}`));
  const allChecked = allKeys.length > 0 && allKeys.every(k => !!selected[k]);
  const someChecked = allKeys.some(k => !!selected[k]);

  const selectedKeys = Object.keys(selected).filter(k => selected[k]);
  let colorIndex = 0;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Sora:wght@300;400;600;700&display=swap');
        * { margin:0; padding:0; box-sizing:border-box; }
        body { background:#080e1a; color:#e2eaf8; font-family:'Sora',sans-serif; }
        body::before {
          content:''; position:fixed; inset:0;
          background-image: linear-gradient(rgba(56,139,253,0.06) 1px,transparent 1px), linear-gradient(90deg,rgba(56,139,253,0.06) 1px,transparent 1px);
          background-size:40px 40px; pointer-events:none; z-index:0;
        }
        .upload-btn { background:linear-gradient(135deg,#3b82f6,#06d6a0); border:none; color:white; border-radius:10px; padding:10px 18px; font-size:13px; font-family:'Sora',sans-serif; cursor:pointer; font-weight:600; transition:opacity .2s; width:100%; }
        .upload-btn:hover { opacity:.85; }
        .checkbox-row { display:flex; align-items:center; gap:8px; padding:5px 8px; border-radius:8px; cursor:pointer; transition:background .2s; font-size:12px; }
        .checkbox-row:hover { background:rgba(56,139,253,0.1); }
        .checkbox-row input { accent-color:#3b82f6; width:13px; height:13px; cursor:pointer; flex-shrink:0; }
        .group-header { display:flex; align-items:center; gap:8px; padding:7px 8px 3px; cursor:pointer; border-radius:8px; transition:background .2s; }
        .group-header:hover { background:rgba(56,139,253,0.08); }
        .group-title { font-size:11px; color:#3b82f6; text-transform:uppercase; letter-spacing:1px; font-weight:700; }
        .group-check { accent-color:#3b82f6; width:13px; height:13px; cursor:pointer; flex-shrink:0; }
        .file-section { border:1px solid rgba(56,139,253,0.15); border-radius:12px; padding:12px; margin-bottom:12px; background:rgba(13,22,40,0.8); }
        .quick-section { border:1px solid rgba(6,214,160,0.25); border-radius:12px; padding:12px; margin-bottom:12px; background:rgba(6,214,160,0.05); }
        .empty-state { display:flex; flex-direction:column; align-items:center; justify-content:center; height:100%; gap:12px; color:#5b7aa8; font-size:14px; text-align:center; }
        .zoom-hint { font-size:11px; color:#5b7aa8; font-family:'DM Mono',monospace; text-align:right; }
        .zoom-badge { display:inline-flex; align-items:center; gap:6px; background:rgba(59,130,246,0.15); border:1px solid rgba(59,130,246,0.3); border-radius:6px; padding:4px 10px; font-size:11px; color:#3b82f6; font-family:'DM Mono',monospace; cursor:pointer; transition:background .2s; }
        .zoom-badge:hover { background:rgba(59,130,246,0.25); }
        .indent { padding-left:16px; }
        .section-label { font-size:10px; color:#5b7aa8; text-transform:uppercase; letter-spacing:1.5px; font-weight:700; margin-bottom:6px; padding:0 4px; }
      `}</style>

      {/* Header */}
      <header style={{ position:"relative", zIndex:10, display:"flex", alignItems:"center", justifyContent:"space-between", padding:"20px 40px", borderBottom:"1px solid rgba(56,139,253,0.15)", background:"rgba(8,14,26,0.85)", backdropFilter:"blur(12px)" }}>
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          <div style={{ width:36, height:36, background:"linear-gradient(135deg,#3b82f6,#06d6a0)", borderRadius:10, display:"flex", alignItems:"center", justifyContent:"center", fontSize:18 }}>⚡</div>
          <div style={{ fontSize:20, fontWeight:700, letterSpacing:"-0.5px" }}>Perf<span style={{ color:"#06d6a0" }}>Chart</span></div>
        </div>
        <div style={{ fontSize:13, color:"#5b7aa8", fontFamily:"'DM Mono',monospace" }}>
          {files.length} fichier{files.length > 1 ? "s" : ""} chargé{files.length > 1 ? "s" : ""} — {selectedKeys.length} courbe{selectedKeys.length > 1 ? "s" : ""} affichée{selectedKeys.length > 1 ? "s" : ""}
        </div>
      </header>

      {/* Layout */}
      <div style={{ position:"relative", zIndex:5, display:"grid", gridTemplateColumns:"300px 1fr", height:"calc(100vh - 73px)" }}>

        {/* Panneau gauche */}
        <div style={{ borderRight:"1px solid rgba(56,139,253,0.15)", padding:"20px 16px", overflowY:"auto", background:"rgba(8,14,26,0.6)" }}>

          {/* Bouton upload */}
          <label style={{ display:"block", marginBottom:16 }}>
            <input type="file" accept=".xlsx,.xls" multiple onChange={handleFileUpload} style={{ display:"none" }} />
            <div className="upload-btn" style={{ textAlign:"center" }}>📂 Charger un ou plusieurs fichiers Excel</div>
          </label>

          {files.length === 0 && (
            <div style={{ textAlign:"center", color:"#5b7aa8", fontSize:13, marginTop:32 }}>
              Aucun fichier chargé.<br />Cliquez sur le bouton ci-dessus.
            </div>
          )}

          {files.length > 0 && (
            <>
              {/* Section sélection rapide */}
              <div className="quick-section">
                <div className="section-label">Sélection rapide</div>

                {/* Tout sélectionner tous fichiers */}
                <label className="checkbox-row" style={{ marginBottom:8 }}>
                  <input
                    type="checkbox"
                    checked={allChecked}
                    ref={el => { if (el) el.indeterminate = someChecked && !allChecked; }}
                    onChange={toggleAll}
                  />
                  <span style={{ fontWeight:600, color:"#e2eaf8" }}>Tout sélectionner</span>
                </label>

                {/* Un bloc par fichier */}
                {files.map(file => {
                  const mainCols = file.columns.filter(col => isMainIndicator(col));
                  const mainKeys = mainCols.map(c => `${file.name}__${c}`);
                  const fileMainAllChecked = mainKeys.length > 0 && mainKeys.every(k => !!selected[k]);
                  const fileMainSomeChecked = mainKeys.some(k => !!selected[k]);

                  return (
                    <div key={file.name} style={{ borderTop:"1px solid rgba(56,139,253,0.1)", paddingTop:8, marginTop:4 }}>
                      {/* Nom du fichier */}
                      <div style={{ fontSize:11, color:"#06d6a0", fontFamily:"'DM Mono',monospace", marginBottom:4, paddingLeft:4, wordBreak:"break-all" }}>
                        📄 {file.name}
                      </div>

                      {/* Indicateurs principaux du fichier */}
                      <label className="checkbox-row">
                        <input
                          type="checkbox"
                          checked={fileMainAllChecked}
                          ref={el => { if (el) el.indeterminate = fileMainSomeChecked && !fileMainAllChecked; }}
                          onChange={() => {
                            setSelected(prev => {
                              const allC = mainKeys.every(k => prev[k]);
                              const updated = { ...prev };
                              mainKeys.forEach(k => { updated[k] = !allC; });
                              rebuildChartData(files, updated);
                              return updated;
                            });
                          }}
                        />
                        <span style={{ fontWeight:600, color:"#06d6a0" }}>Indicateurs principaux</span>
                      </label>

                      {/* Liste des indicateurs principaux */}
                      <div style={{ paddingLeft:20, marginTop:2 }}>
                        {mainCols.map(col => {
                          const key = `${file.name}__${col}`;
                          return (
                            <label key={key} className="checkbox-row">
                              <input
                                type="checkbox"
                                checked={!!selected[key]}
                                onChange={() => toggleColumn(key)}
                              />
                              <span style={{ color:"#a0b4d0" }}>{col}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Séparateur */}
              <div style={{ borderTop:"1px solid rgba(56,139,253,0.1)", margin:"4px 0 12px" }} />

              {/* Fichiers détaillés */}
              {files.map(file => {
                const groups = groupColumns(file.columns);
                const fileKeys = file.columns.map(c => `${file.name}__${c}`);
                const fileAllChecked = fileKeys.every(k => !!selected[k]);
                const fileSomeChecked = fileKeys.some(k => !!selected[k]);

                return (
                  <div key={file.name} className="file-section">
                    <label className="group-header" style={{ marginBottom:6 }}>
                      <input
                        type="checkbox"
                        className="group-check"
                        checked={fileAllChecked}
                        ref={el => { if (el) el.indeterminate = fileSomeChecked && !fileAllChecked; }}
                        onChange={() => toggleGroup(file.name, file.columns)}
                      />
                      <span style={{ fontSize:12, color:"#06d6a0", fontFamily:"'DM Mono',monospace", wordBreak:"break-all" }}>
                        📄 {file.name}
                      </span>
                    </label>

                    {groups.map(group => {
                      const groupKeys = group.columns.map(c => `${file.name}__${c}`);
                      const groupAllChecked = groupKeys.every(k => !!selected[k]);
                      const groupSomeChecked = groupKeys.some(k => !!selected[k]);
                      return (
                        <div key={group.label} style={{ marginBottom:6 }}>
                          <label className="group-header">
                            <input
                              type="checkbox"
                              className="group-check"
                              checked={groupAllChecked}
                              ref={el => { if (el) el.indeterminate = groupSomeChecked && !groupAllChecked; }}
                              onChange={() => toggleGroup(file.name, group.columns)}
                            />
                            <span className="group-title">{group.label}</span>
                          </label>
                          <div className="indent">
                            {group.columns.map(col => {
                              const key = `${file.name}__${col}`;
                              return (
                                <label key={key} className="checkbox-row">
                                  <input
                                    type="checkbox"
                                    checked={!!selected[key]}
                                    onChange={() => toggleColumn(key)}
                                  />
                                  <span style={{ color:"#a0b4d0" }}>{col}</span>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </>
          )}
        </div>

        {/* Zone graphique */}
        <div style={{ padding:"32px", display:"flex", flexDirection:"column", gap:12 }}>
          {selectedKeys.length === 0 ? (
            <div className="empty-state">
              <span style={{ fontSize:48 }}>📈</span>
              <span>Chargez un fichier Excel et sélectionnez des indicateurs pour afficher les courbes</span>
            </div>
          ) : (
            <>
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                <div style={{ fontSize:15, fontWeight:600 }}>
                  Évolution des indicateurs sélectionnés
                </div>
                <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                  {zoomLeft !== null && (
                    <span className="zoom-badge" onClick={handleDoubleClick}>
                      🔍 {zoomLeft}s → {zoomRight}s &nbsp;✕
                    </span>
                  )}
                  <span className="zoom-hint">
                    {zoomLeft === null
                      ? "Cliquer-glisser pour zoomer · Double-clic pour réinitialiser"
                      : "Double-clic sur le graphique pour réinitialiser"}
                  </span>
                </div>
              </div>

              <div style={{ background:"#0d1628", border:"1px solid rgba(56,139,253,0.15)", borderRadius:20, padding:"24px", flex:1, cursor:"crosshair" }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={displayedData}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onDoubleClick={handleDoubleClick}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(56,139,253,0.06)" />
                    <XAxis
                      dataKey="Temps"
                      tick={{ fill:"#5b7aa8", fontSize:11, fontFamily:"'DM Mono',monospace" }}
                      label={{ value:"Temps (s)", position:"insideBottom", offset:-4, fill:"#5b7aa8", fontSize:12 }}
                    />
                    <YAxis
                      tick={{ fill:"#5b7aa8", fontSize:11, fontFamily:"'DM Mono',monospace" }}
                      label={{ value:"Charge (%)", angle:-90, position:"insideLeft", fill:"#5b7aa8", fontSize:12 }}
                    />
                    <Tooltip
                      contentStyle={{ background:"#0d1628", border:"1px solid rgba(56,139,253,0.3)", color:"#e2eaf8", fontFamily:"'DM Mono',monospace", fontSize:12 }}
                      formatter={(value: any, name: any) => {
                        const shortName = String(name).split("__")[1];
                        return [value, shortName];
                      }}
                      labelFormatter={(label: any) => `t = ${label}s`}
                    />
                    <Legend
                      formatter={(value: any) => String(value).split("__")[1]}
                      wrapperStyle={{ fontSize:12, fontFamily:"'DM Mono',monospace", color:"#5b7aa8" }}
                    />
                    {isSelecting && refAreaLeft !== null && refAreaRight !== null && (
                      <ReferenceArea
                        x1={refAreaLeft}
                        x2={refAreaRight}
                        strokeOpacity={0.3}
                        stroke="#3b82f6"
                        fill="rgba(59,130,246,0.15)"
                      />
                    )}
                    {selectedKeys.map(key => {
                      const color = COLORS[colorIndex % COLORS.length];
                      colorIndex++;
                      return (
                        <Line
                          key={key}
                          type="monotone"
                          dataKey={key}
                          stroke={color}
                          strokeWidth={2}
                          dot={false}
                          isAnimationActive={false}
                        />
                      );
                    })}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}