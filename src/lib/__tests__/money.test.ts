import { afterEach, describe, expect, it } from "vitest";
import { CURRENCIES, displayCurrency, money, setDisplayCurrency } from "../money";
import { demoProfile } from "../../store/seed";
import { netPosition } from "../advisor";
import { prepayVsInvest } from "../advisor";

afterEach(() => setDisplayCurrency("INR"));

describe("currency formatting", () => {
  it("uses lakh and crore for INR", () => {
    expect(money(6_500_000, "INR")).toBe("₹65.00L");
    expect(money(12_000_000, "INR")).toBe("₹1.20Cr");
    expect(money(4_200, "INR")).toBe("₹4.20K");
    expect(money(750, "INR")).toBe("₹750");
  });

  it("uses thousands and millions for USD", () => {
    // Three-digit figures drop the decimals: "$380K" reads better than
    // "$380.00K", while "$1.25M" needs them to stay meaningful.
    expect(money(380_000, "USD")).toBe("$380K");
    expect(money(1_250_000, "USD")).toBe("$1.25M");
    expect(money(34_000, "USD")).toBe("$34.00K");
    expect(money(750, "USD")).toBe("$750");
  });

  it("keeps the sign on negative amounts", () => {
    expect(money(-65_000, "INR")).toBe("-₹65.00K");
    expect(money(-1_500, "USD")).toBe("-$1.50K");
  });

  it("follows the active currency when none is passed", () => {
    setDisplayCurrency("USD");
    expect(displayCurrency()).toBe("USD");
    // This is the bug that mattered: tool result strings call money() without
    // a currency argument, and used to render rupees for a dollar profile.
    expect(money(50_000)).toBe("$50.00K");
    setDisplayCurrency("INR");
    expect(money(50_000)).toBe("₹50.00K");
  });

  it("exposes a symbol and locale for both currencies", () => {
    expect(CURRENCIES.INR.symbol).toBe("₹");
    expect(CURRENCIES.USD.symbol).toBe("$");
  });
});

describe("the USD sample profile", () => {
  const usd = demoProfile("USD");
  const inr = demoProfile("INR");

  it("is denominated in dollars and flagged as sample data", () => {
    expect(usd.currency).toBe("USD");
    expect(usd.isSample).toBe(true);
    expect(inr.currency).toBe("INR");
  });

  it("has positive net worth, like its rupee counterpart", () => {
    expect(netPosition(usd).netWorth).toBeGreaterThan(0);
    expect(netPosition(inr).netWorth).toBeGreaterThan(0);
  });

  it("preserves the three-way tension that makes the demo work", () => {
    const r = prepayVsInvest(usd, 10_000, 60);
    // The card is far above market returns, so it must win outright.
    expect(r.best!.loanId).toBe("loan_card");
    expect(r.best!.winner).toBe("prepay");
    // The mortgage is below the assumed return, so it must point the other way.
    const mortgage = r.options.find((o) => o.loanId === "loan_home")!;
    expect(mortgage.winner).toBe("invest");
  });

  it("keeps a realistic, non-trivial debt burden", () => {
    const np = netPosition(usd);
    expect(np.totalDebt).toBeGreaterThan(300_000);
    expect(np.monthlySurplus).toBeGreaterThan(0);
  });
});
