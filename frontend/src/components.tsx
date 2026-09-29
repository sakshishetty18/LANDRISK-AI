import type { ReactNode } from "react";

export function Icon({ name, size = 18 }: { name: string; size?: number }) {
  const paths: Record<string, ReactNode> = {
    grid: <><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></>,
    folder: <path d="M3 7h7l2 2h9v10H3zM3 7V5h7l2 2"/>,
    spark: <><path d="m13 2-2.4 7H4l5.4 3.8L7 21l10-11h-6z"/><path d="M18 3v4M16 5h4"/></>,
    map: <><path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3z"/><path d="M9 3v15M15 6v15"/></>,
    chart: <><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></>,
    bolt: <path d="M12 2 4 14h7l-1 8 8-12h-7z"/>,
    bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/></>,
    pulse: <><path d="M3 12h4l2-6 4 12 2-6h6"/><circle cx="12" cy="12" r="10"/></>,
    file: <><path d="M6 2h8l4 4v16H6z"/><path d="M14 2v5h5M9 12h6M9 16h6"/></>,
    check: <path d="m5 12 4 4L19 6"/>,
    shield: <><path d="M12 2 4 5v6c0 5 3 9 8 11 5-2 8-6 8-11V5z"/><path d="m9 12 2 2 4-5"/></>,
    users: <><circle cx="9" cy="8" r="4"/><path d="M2 21v-2a6 6 0 0 1 12 0v2M16 4a4 4 0 0 1 0 8M17 15a6 6 0 0 1 5 6"/></>,
    history: <><circle cx="12" cy="12" r="9"/><path d="M12 7v6l4 2M4 4v5h5"/></>,
    settings: <><circle cx="12" cy="12" r="3"/><path d="M19 13.5v-3l2-1-2-4-2 1a8 8 0 0 0-3-2V2h-4v2.5a8 8 0 0 0-3 2l-2-1-2 4 2 1v3l-2 1 2 4 2-1a8 8 0 0 0 3 2V22h4v-2.5a8 8 0 0 0 3-2l2 1 2-4z"/></>,
    search: <><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></>,
    arrow: <path d="M5 12h14m-5-5 5 5-5 5"/>,
    chevron: <path d="m15 18-6-6 6-6"/>,
    chevronRight: <path d="m9 18 6-6-6-6"/>,
    dots: <><circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/></>,
    lock: <><rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></>,
    mail: <><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></>,
    menu: <path d="M3 6h18M3 12h18M3 18h18"/>,
    close: <path d="m6 6 12 12M18 6 6 18"/>,
    filter: <path d="M3 4h18l-7 8v6l-4 2v-8z"/>,
    download: <path d="M12 3v12m-5-5 5 5 5-5M4 21h16"/>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M8 3v4M16 3v4M3 10h18"/></>,
    external: <path d="M14 3h7v7M21 3 10 14M18 13v8H3V6h8"/>,
    upload: <path d="M12 16V4m-5 5 5-5 5 5M4 20h16"/>,
  };
  return <svg className="icon" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">{paths[name] || paths.grid}</svg>;
}

export function Logo({ large, compact }: { large?: boolean; compact?: boolean }) {
  return <div className={`logo ${large ? "large" : ""} ${compact ? "compact" : ""}`}><div className="logo-mark"><svg viewBox="0 0 40 40"><path d="M20 3 34 11v16L20 36 6 28V12z"/><circle cx="20" cy="17" r="5"/><path d="M20 22v8M10 14l5 2M30 14l-5 2M11 27l5-6M29 27l-5-6"/></svg></div>{!compact && <div><strong>LANDRISK-AI</strong><span>RESEARCH PROTOTYPE</span></div>}</div>;
}

export function Pill({ children, tone = "blue" }: { children: ReactNode; tone?: string }) {
  return <span className={`pill ${tone}`}>{children}</span>;
}

export function RiskBadge({ status }: { status: string }) {
  return <span className={`risk-badge ${status.toLowerCase()}`}><i />{status.toUpperCase()}</span>;
}

export function ProgressBar({ value, tone = "blue" }: { value: number; tone?: string }) {
  return <div className="progress-track"><span className={tone} style={{ width: `${value}%` }} /></div>;
}

export function Sparkline({ tone = "blue", variant = 0 }: { tone?: string; variant?: number }) {
  const points = variant % 2 ? "0,27 15,18 30,23 45,11 60,15 76,5 94,9 112,2" : "0,23 15,26 30,17 45,20 60,10 76,13 94,4 112,8";
  return <svg className={`sparkline ${tone}`} viewBox="0 0 112 32" preserveAspectRatio="none"><defs><linearGradient id={`grad-${tone}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="currentColor" stopOpacity=".35"/><stop offset="1" stopColor="currentColor" stopOpacity="0"/></linearGradient></defs><path className="spark-area" d={`M ${points.replaceAll(" ", " L ")} L112 32 L0 32Z`} /><polyline points={points} /></svg>;
}

export function MetricCard({ label, value, detail, trend, tone = "blue", icon, variant = 0 }: { label: string; value: string; detail: string; trend: string; tone?: string; icon: string; variant?: number }) {
  return <article className={`metric-card tone-${tone}`}><div className="metric-head"><span>{label}</span><div className="metric-icon"><Icon name={icon} /></div></div><strong className="metric-value">{value}</strong><div className="metric-meta"><span className={trend.startsWith("+") ? "positive" : ""}>{trend}</span> {detail}</div><Sparkline tone={tone} variant={variant} /></article>;
}

export function SectionHeader({ eyebrow, title, description, actions }: { eyebrow?: string; title: string; description?: string; actions?: ReactNode }) {
  return <div className="section-header"><div>{eyebrow && <span className="eyebrow">{eyebrow}</span>}<h2>{title}</h2>{description && <p>{description}</p>}</div>{actions && <div className="section-actions">{actions}</div>}</div>;
}

export function SelectButton({ children }: { children: ReactNode }) {
  return <button className="select-button">{children}<Icon name="chevronRight" /></button>;
}

export function Donut({ value, label, tone = "blue", size = "medium" }: { value: number; label: string; tone?: string; size?: string }) {
  return <div className={`donut ${tone} ${size}`} style={{ "--value": value } as React.CSSProperties}><div><strong>{value}</strong><span>{label}</span></div></div>;
}
