import { CURRENCIES, type CurrencyCode } from "../lib/money";
import { setCurrency, useSelector } from "../store/store";

const CODES: CurrencyCode[] = ["INR", "USD"];

export function CurrencyToggle() {
  const currency = useSelector((s) => s.profile.currency);
  const isSample = useSelector((s) => s.profile.isSample);

  return (
    <div className="seg" role="group" aria-label="Display currency">
      {CODES.map((code) => (
        <button
          key={code}
          className={currency === code ? "on" : ""}
          onClick={() => setCurrency(code)}
          title={
            isSample
              ? `Show the ${CURRENCIES[code].label} sample profile`
              : `Format your figures in ${CURRENCIES[code].label}`
          }
        >
          {CURRENCIES[code].symbol} {code}
        </button>
      ))}
    </div>
  );
}
