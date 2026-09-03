import type { ReactNode } from "react";
import { useSelector } from "../store/store";

export function Label({ children, tone }: { children: ReactNode; tone?: string }) {
  return <div className="lbl" style={tone ? { color: tone } : undefined}>{children}</div>;
}

export function PageHead({ eyebrow, title, sub }: { eyebrow: string; title: string; sub?: string }) {
  return (
    <div className="r d1">
      <Label>{eyebrow}</Label>
      <h1 className="fig" style={{ fontSize: 34, marginTop: 12, lineHeight: 1.2 }}>{title}</h1>
      {sub && <p style={{ color: "var(--muted)", marginTop: 12, maxWidth: "62ch", lineHeight: 1.75 }}>{sub}</p>}
    </div>
  );
}

export function Hero({ figure, sub, sheen = true }: { figure: string; sub: ReactNode; sheen?: boolean }) {
  return (
    <div className="r d2">
      <div className={`fig hero ${sheen ? "sheen" : ""}`}>{figure}</div>
      <p className="hero-sub">{sub}</p>
    </div>
  );
}

export function Vital({ label, value, note, tone, delay = "d4" }: {
  label: string; value: ReactNode; note: string; tone?: "warn" | "good"; delay?: string;
}) {
  return (
    <div className={`vital r ${delay}`}>
      <Label>{label}</Label>
      <div className={`v ${tone ?? ""}`}>{value}</div>
      <div className="n">{note}</div>
    </div>
  );
}

export function Section({ title, children, delay = "d5" }: { title: string; children: ReactNode; delay?: string }) {
  return (
    <section className={`section r ${delay}`}>
      <Label>{title}</Label>
      <div style={{ marginTop: 18 }}>{children}</div>
    </section>
  );
}

/** Flashes when an agent tool call names this entity. */
export function useFlash(id: string): boolean {
  return useSelector((s) => (s.highlighted[id] ?? 0) > Date.now());
}

export function Row({ id, title, amount, meta, tag, tagTone }: {
  id?: string; title: ReactNode; amount: ReactNode; meta: ReactNode[];
  tag?: string; tagTone?: "hot" | "good" | "gold";
}) {
  const flash = useFlash(id ?? "");
  return (
    <div className={`row ${flash ? "flash" : ""}`}>
      <div className="t">
        <span>{title}</span>
        {tag && <span className={`tag ${tagTone ?? ""}`}>{tag}</span>}
      </div>
      <div className="a">{amount}</div>
      <div className="m">{meta.map((m, i) => <span key={i}>{m}</span>)}</div>
    </div>
  );
}

export function B({ children }: { children: ReactNode }) {
  return <b>{children}</b>;
}

export function Bar({ parts }: { parts: Array<{ pct: number; color: string }> }) {
  return (
    <div className="bar r d3" style={{ marginTop: 40 }}>
      {parts.map((p, i) => (
        <i key={i} style={{ width: `${p.pct}%`, background: p.color, animationDelay: `${0.5 + i * 0.12}s` }} />
      ))}
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="empty">{children}</p>;
}
