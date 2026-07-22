import Link from "next/link";

export const metadata = {
  title: "How it works — RWAM",
  description:
    "How RWAM's premium tracker and Predict markets work — real-ETH UP/DOWN bets, weekend-gap predictions, and the fETH internal wallet with its weekly prize draw.",
};

/** Hand-built SVG diagram of the weekend gap — the core concept behind §01/§02 below: the official close freezes Friday 4pm while the token keeps trading through the weekend, and the premium is the vertical distance between the two by Monday open. */
function WeekendGapDiagram() {
  return (
    <div className="rounded-xl border border-border bg-bg-secondary p-4">
      <svg viewBox="0 0 800 220" className="w-full" xmlns="http://www.w3.org/2000/svg">
        <line x1="60" y1="170" x2="740" y2="170" stroke="var(--border)" strokeWidth="1" />

        <line
          x1="120"
          y1="112"
          x2="680"
          y2="112"
          stroke="var(--text-muted)"
          strokeWidth="2"
          strokeDasharray="6 7"
        />
        <circle cx="120" cy="112" r="5" fill="var(--text-secondary)" />

        <path
          d="M120,112 C220,100 260,140 320,120 S420,70 480,90 S600,50 680,58"
          fill="none"
          stroke="var(--accent)"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <circle cx="680" cy="58" r="5" fill="var(--accent)" />

        <line x1="680" y1="58" x2="680" y2="112" stroke="var(--accent)" strokeWidth="1.5" strokeDasharray="3 4" />
        <text x="694" y="89" fontSize="13" fill="var(--accent)" fontWeight="600">
          premium
        </text>

        <line x1="120" y1="178" x2="120" y2="184" stroke="var(--border)" />
        <line x1="680" y1="178" x2="680" y2="184" stroke="var(--border)" />

        <text x="120" y="204" fontSize="12" fill="var(--text-secondary)" textAnchor="middle">
          Fri 4:00pm — official close (frozen)
        </text>
        <text x="400" y="204" fontSize="12" fill="var(--text-muted)" textAnchor="middle">
          weekend — token keeps trading
        </text>
        <text x="680" y="204" fontSize="12" fill="var(--text-secondary)" textAnchor="middle">
          Mon 9:30am — market reopens
        </text>
      </svg>
    </div>
  );
}

function Section({
  step,
  title,
  children,
}: {
  step: string;
  children: React.ReactNode;
  title: string;
}) {
  return (
    <section className="rounded-xl border border-border bg-bg-secondary p-5">
      <p className="text-xs font-semibold uppercase tracking-wide text-accent">{step}</p>
      <h2 className="mt-1 text-lg font-semibold text-text-primary">{title}</h2>
      <div className="mt-2 flex flex-col gap-2 text-sm text-text-secondary">{children}</div>
    </section>
  );
}

export default function HowItWorksPage() {
  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold tracking-tight">How RWAM works</h1>
        <p className="text-sm text-text-secondary">
          RWAM has two halves: a live dashboard that tracks the premium
          between Robinhood&apos;s tokenized stocks and their real closing
          price (<Link href="/" className="text-accent hover:underline">Implied Open</Link>), and{" "}
          <Link href="/predict" className="text-accent hover:underline">Predict</Link>,
          where you can actually bet on which way a stock moves — with real
          ETH or with fETH, a free internal-wallet currency that needs no
          wallet at all. Everything below is Robinhood Chain testnet — not
          investment advice.
        </p>
      </div>

      <WeekendGapDiagram />

      <Section step="01 · Watch it" title="The premium — Implied Open">
        <p>
          Robinhood&apos;s tokenized stocks (NVDA, AAPL, TSLA, …) trade 24/7 on
          Robinhood Chain, but the real exchange only prices them during
          market hours. The gap between the token&apos;s live price and its
          frozen official close — the <strong className="text-text-primary">premium</strong> —
          is the on-chain crowd&apos;s running bet on where the stock reopens.
          The dashboard shows this for every stock with a live feed, updated
          continuously.
        </p>
      </Section>

      <Section step="02 · Bet on it — real ETH" title="Predict: UP/DOWN markets">
        <p>
          Every predictable ticker runs non-custodial, pari-mutuel markets:
          put ETH on <strong className="text-accent">UP</strong> or{" "}
          <strong className="text-danger">DOWN</strong> before the market
          locks. Winners split the losing side&apos;s pool pro-rata to their
          stake — nobody, including RWAM, decides the outcome. The contract
          reads the same price feed everyone can see, at the moment anyone
          calls lock/resolve.
        </p>
        <p>Two kinds of market, same mechanic, different window:</p>
        <ul className="list-disc pl-5">
          <li>
            <strong className="text-text-primary">Trading session</strong> —
            up or down between the open and close of a single NYSE session,
            a few hours apart.
          </li>
          <li>
            <strong className="text-text-primary">Weekend gap</strong> — bet
            Friday&apos;s close (16:00 ET) against Monday&apos;s open (09:30
            ET). This is the literal on-chain version of the premium the
            dashboard already shows passively — betting on whether that
            implied direction is actually right.
          </li>
        </ul>
        <p>
          Real-ETH bets need a browser wallet (MetaMask/Rabby — see{" "}
          <span className="text-text-primary">Connect wallet</span> on any
          ticker&apos;s Predict page) and Robinhood Chain testnet ETH for gas.
        </p>
      </Section>

      <Section step="03 · Bet on it — no wallet" title="fETH: your internal wallet">
        <p>
          <strong className="text-text-primary">fETH</strong> (fake ETH) lets
          anyone play the same UP/DOWN markets with zero setup —{" "}
          <strong className="text-text-primary">no wallet extension, no gas, no signup.</strong>{" "}
          The first time you open a ticker&apos;s Predict page, RWAM quietly
          assigns you an internal wallet (a cosmetic address, shown at the top
          of the fETH tab) and remembers it for you.
        </p>
        <p>
          Claim <strong className="text-text-primary">0.1 fETH</strong> once a
          week, then bet it on UP or DOWN just like a real-money market.
          Winnings are credited straight back to your internal balance — no
          separate claim step, since there&apos;s no gas to pay. Balances
          reset to 0.1 every Thursday 00:00 UTC, not additive — last
          week&apos;s wins or losses don&apos;t carry over, same as a fantasy
          league resetting each week.
        </p>
        <p>
          Because fETH never touches a wallet, RWAM enforces &quot;once a
          week&quot; with a stored identifier tied to your browser instead of a signed
          transaction — good enough to stop casual re-claims, though clearing
          cookies or switching browsers resets it. fETH itself can never leave
          the site, be withdrawn, or represent real value: it&apos;s a
          leaderboard game, not an asset.
        </p>
      </Section>

      <Section step="04 · Win it" title="Weekly leaderboard + champion bonus">
        <p>
          Every fETH bet counts toward the{" "}
          <Link href="/predict/leaderboard" className="text-accent hover:underline">
            weekly leaderboard
          </Link>{" "}
          — ranked by net (winnings minus stakes) since the current Thursday
          reset. When the week rolls over, whoever finished #1 with a
          positive net gets a bonus added on top of their <em>next</em> weekly
          claim — a small, symbolic prize draw for the best predictor, shown
          as a 🏆 banner on the leaderboard. The real-ETH leaderboard is
          separate and all-time, since real bets don&apos;t reset weekly.
        </p>
      </Section>

      <div className="rounded-xl border border-border bg-bg-secondary/50 p-4 text-xs text-text-muted">
        Robinhood Chain testnet only. fETH and testnet ETH have no real-world
        value. Nothing here is investment advice.
      </div>
    </div>
  );
}
