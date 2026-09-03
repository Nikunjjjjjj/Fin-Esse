import type { ReactNode } from "react";
import { useSelector } from "../store/store";

export function Panel({
  title,
  count,
  actions,
  children,
  tight,
}: {
  title: string;
  count?: number | string;
  actions?: ReactNode;
  children: ReactNode;
  tight?: boolean;
}) {
  return (
    <section className="panel">
      <header>
        <h2>{title}</h2>
        {count !== undefined && <span className="count">{count}</span>}
        <span className="spacer" />
        {actions}
      </header>
      <div className={tight ? "body tight" : "body"}>{children}</div>
    </section>
  );
}

/**
 * Flashes when an agent tool call names this entity, so a person watching can
 * see which card the agent is reasoning about at the moment it happens.
 */
export function useFlash(id: string): boolean {
  return useSelector((s) => (s.highlighted[id] ?? 0) > Date.now());
}

export function Card({ id, children }: { id: string; children: ReactNode }) {
  const flash = useFlash(id);
  return <div className={flash ? "card flash" : "card"}>{children}</div>;
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="empty">{children}</p>;
}
