import { CURRENCIES, type CurrencyCode } from "../lib/money";
import { setCurrency, useSelector } from "../store/store";

const CODES: CurrencyCode[] = ["INR", "USD"];

export function CurrencyToggle() {
  const currency = useSelector((s) => s.profile.currency);
  const isSample = useSelector((s) => s.profile.isSample);

  return (
    <div style={{ display: "inline-flex", border: "1px solid var(--edge)" }} role="group" aria-label="Display currency">
      {CODES.map((code, i) => (
        <button
          key={code}
          onClick={() => setCurrency(code)}
          title={isSample ? `Show the ${CURRENCIES[code].label} sample` : `Format figures in ${CURRENCIES[code].label}`}
          style={{
            padding: "5px 11px", fontSize: 12, letterSpacing: ".04em",
            borderLeft: i ? "1px solid var(--edge)" : undefined,
            background: currency === code ? "var(--raise)" : "transparent",
            color: currency === code ? "var(--gold)" : "var(--muted)",
          }}
        >
          {CURRENCIES[code].symbol} {code}
        </button>
      ))}
    </div>
  );
}
