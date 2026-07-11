import type React from "react";
import { palette } from "@/lib/theme";

export function AppStyles(): React.JSX.Element {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Fraunces:opsz,wght@9..144,500;9..144,600&family=DM+Mono:wght@400;500&display=swap');
      * { box-sizing: border-box; }
      .grid { display:grid; gap:16px; align-items:start; }
      .card { background:${palette.panel}; border:1px solid ${palette.line}; border-radius:14px; padding:20px; }
      .eyebrow { font:500 11px/1 'DM Mono',monospace; letter-spacing:.14em; text-transform:uppercase; color:${palette.faint}; }
      .num { font-family:'DM Mono',monospace; font-variant-numeric:tabular-nums; }
      .disp { font-family:'Fraunces',serif; }
      button { font-family:inherit; cursor:pointer; }
      input, select { font-family:'DM Mono',monospace; }
      .seg { background:${palette.panel2}; border:1px solid ${palette.line}; color:${palette.sub}; padding:6px 12px; border-radius:8px; font-size:13px; transition:.15s; white-space:nowrap; }
      .seg.on { background:${palette.acc}; color:#06110e; border-color:${palette.acc}; font-weight:600; }
      .seg:disabled { opacity:.5; cursor:default; }
      .inp { width:100%; background:${palette.panel}; border:1px solid ${palette.line}; color:${palette.ink}; border-radius:7px; padding:8px 10px; font-size:14px; }
      .recharts-default-tooltip { background:${palette.panel2}!important; border:1px solid ${palette.line}!important; border-radius:8px!important; }
      .recharts-tooltip-label { color:${palette.sub}!important; font-family:'DM Mono',monospace; font-size:12px; }
      .recharts-tooltip-item, .recharts-tooltip-item-name, .recharts-tooltip-item-value { color:${palette.ink}!important; font-family:'DM Mono',monospace!important; font-size:13px!important; }
      .span-full { grid-column:1/-1; } .span-2 { grid-column:span 2; }
      .compo { display:grid; grid-template-columns:1fr 1fr; gap:20px; align-items:center; }
      .poscard { background:${palette.bg}; border:1px solid ${palette.line}; border-radius:10px; padding:14px; }
      .posrow { display:grid; grid-template-columns:1.4fr .9fr 1fr .9fr auto; gap:10px; align-items:end; }
      .barra { height:8px; background:${palette.panel2}; border-radius:4px; overflow:hidden; position:relative; }
      .barra-fill { height:100%; border-radius:4px; transition:width .2s; }
      .tabnav { display:flex; gap:6px; flex-wrap:wrap; background:${palette.panel2}; border:1px solid ${palette.line}; border-radius:10px; padding:4px; }
      .tabbtn { background:transparent; border:none; color:${palette.sub}; padding:9px 18px; border-radius:7px; font-size:13.5px; font-weight:500; transition:.15s; white-space:nowrap; }
      .tabbtn.on { background:${palette.acc}; color:#06110e; font-weight:700; }
      .roadmap { display:flex; gap:0; align-items:stretch; }
      .roadstep { flex:1; padding:14px 12px; border-top:3px solid ${palette.line}; position:relative; }
      .roadstep.done { border-top-color:${palette.acc}; }
      .roadstep.now { border-top-color:${palette.acc}; }
      .roadstep.now::before { content:""; position:absolute; top:-6px; left:0; width:100%; height:3px; background:${palette.acc}; box-shadow:0 0 8px ${palette.acc}; }
      .gf-row { display:grid; grid-template-columns:1fr 140px auto; gap:8px; align-items:center; }
      .evt-row { display:grid; grid-template-columns:1.5fr .8fr 1fr auto; gap:8px; }
      .deuda-row { display:grid; grid-template-columns:1.6fr .8fr .8fr auto; gap:10px; align-items:end; }
      @media (max-width:900px){ .span-2 { grid-column:1/-1; } .compo { grid-template-columns:1fr; } .roadmap { flex-direction:column; } .roadstep { border-top:none; border-left:3px solid ${palette.line}; padding-left:16px; } .roadstep.now, .roadstep.done { border-left-color:${palette.acc}; } }
      @media (max-width:760px){ .hide-sm { display:none; } .card { padding:16px; } .posrow { grid-template-columns:1fr 1fr; } }
      @media (max-width:640px){ .gf-row, .evt-row, .deuda-row { grid-template-columns:1fr 1fr; } .deuda-row > div:first-child { grid-column:1/-1; } }
      @media (max-width:420px){ .gf-row, .evt-row, .deuda-row { grid-template-columns:1fr; } .tabbtn { padding:8px 12px; font-size:12.5px; } }
    `}</style>
  );
}
