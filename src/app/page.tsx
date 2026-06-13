"use client";

import { useState, useEffect, useRef, useCallback } from "react";

interface OrderResponse {
  success: boolean;
  order?: any;
  error?: string;
  details?: any;
}

interface AccountInfo {
  totalWalletBalance: number;
  totalUnrealizedProfit: number;
  totalMarginBalance: number;
  totalInitialMargin: number;
  totalMaintMargin: number;
  assets: any[];
}

interface Position {
  liquidationPrice: any;
  symbol: string;
  positionAmt: number;
  entryPrice: number;
  markPrice: number;
  unrealizedProfit: number;
  leverage: string;
}

interface PricePoint {
  time: string;
  price: number;
}

const WATCHLIST = ["BTCUSDT", "ETHUSDT", "BNBUSDT", "SOLUSDT", "XRPUSDT"];

// ─── Mini Sparkline ──────────────────────────────────────────────────────────
function Sparkline({
  data,
  color = "#7b39fc",
  height = 40,
}: {
  data: number[];
  color?: string;
  height?: number;
}) {
  if (data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const w = 120,
    h = height;
  const pts = data
    .map(
      (v, i) => `${(i / (data.length - 1)) * w},${h - ((v - min) / range) * h}`,
    )
    .join(" ");
  const area = `M0,${h} L${pts
    .split(" ")
    .map((p, i) => (i === 0 ? `${p}` : `L${p}`))
    .join(" ")} L${w},${h} Z`;
  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      width={w}
      height={h}
      style={{ display: "block" }}
    >
      <defs>
        <linearGradient
          id={`sg-${color.replace("#", "")}`}
          x1="0"
          y1="0"
          x2="0"
          y2="1"
        >
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#sg-${color.replace("#", "")})`} />
      <polyline
        points={pts}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ─── Price Chart ─────────────────────────────────────────────────────────────
function PriceChart({ data }: { data: PricePoint[] }) {
  if (data.length < 2)
    return (
      <div
        style={{
          height: 160,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "rgba(255,255,255,0.4)",
          fontSize: 13,
          fontFamily: "'Inter', sans-serif",
        }}
      >
        Collecting price data…
      </div>
    );
  const prices = data.map((d) => d.price);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = max - min || 1;
  const W = 560,
    H = 160,
    PAD = 10;
  const pts = data.map((d, i) => {
    const x = PAD + (i / (data.length - 1)) * (W - PAD * 2);
    const y = PAD + (1 - (d.price - min) / range) * (H - PAD * 2);
    return { x, y, ...d };
  });
  const polyPts = pts.map((p) => `${p.x},${p.y}`).join(" ");
  const last = pts[pts.length - 1];
  const first = pts[0];
  const isUp = last.price >= first.price;
  const color = isUp ? "#22c55e" : "#ef4444";
  const area = `M${PAD},${H - PAD} L${pts.map((p) => `${p.x},${p.y}`).join(" L")} L${W - PAD},${H - PAD} Z`;
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width="100%"
      height={H}
      style={{ display: "block" }}
    >
      <defs>
        <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
        <filter id="glow">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      {[0, 0.25, 0.5, 0.75, 1].map((t, i) => {
        const y = PAD + t * (H - PAD * 2);
        const price = max - t * range;
        return (
          <g key={i}>
            <line
              x1={PAD}
              y1={y}
              x2={W - PAD}
              y2={y}
              stroke="rgba(255,255,255,0.08)"
              strokeWidth="1"
            />
            <text
              x={W - PAD + 4}
              y={y + 4}
              fill="rgba(255,255,255,0.4)"
              fontSize="9"
              fontFamily="monospace"
            >
              {price.toFixed(0)}
            </text>
          </g>
        );
      })}
      <path d={area} fill="url(#chartGrad)" />
      <polyline
        points={polyPts}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        filter="url(#glow)"
      />
      <circle cx={last.x} cy={last.y} r="3" fill={color} />
      <circle cx={last.x} cy={last.y} r="6" fill={color} opacity="0.3" />
    </svg>
  );
}

// ─── PnL helpers ──────────────────────────────────────────────────────────────
const pnlColor = (v: number) => (v >= 0 ? "#22c55e" : "#ef4444");
const pnlPrefix = (v: number) => (v >= 0 ? "+" : "");
const fmtPct = (v: number) =>
  `${pnlPrefix(v)}${Math.abs(v) < 0.005 ? "0.00" : v.toFixed(2)}%`;

// Small inline badge: colored background + arrow + percentage
function PnLBadge({ pct, size = "md" }: { pct: number; size?: "sm" | "md" }) {
  const color = pnlColor(pct);
  const isSmall = size === "sm";
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        fontSize: isSmall ? 10 : 12,
        fontWeight: 700,
        padding: isSmall ? "2px 6px" : "3px 9px",
        borderRadius: 999,
        background: pct >= 0 ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)",
        color,
        fontFamily: "monospace",
        whiteSpace: "nowrap",
      }}
    >
      {pct >= 0 ? "▲" : "▼"} {fmtPct(pct)}
    </span>
  );
}

// Diverging ROI bar: fills from center, green to the right for profit,
// red to the left for loss. Clamped at ±100% ROI for display purposes.
function RoiBar({ roiPct }: { roiPct: number }) {
  const clamped = Math.max(-100, Math.min(100, roiPct));
  const color = pnlColor(clamped);
  const widthPct = Math.min(Math.abs(clamped) / 2, 50); // half-track max
  return (
    <div
      style={{
        position: "relative",
        height: 4,
        background: "rgba(255,255,255,0.1)",
        borderRadius: 2,
        overflow: "hidden",
      }}
    >
      {/* center marker */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: 0,
          bottom: 0,
          width: 1,
          background: "rgba(255,255,255,0.2)",
        }}
      />
      <div
        style={{
          position: "absolute",
          top: 0,
          bottom: 0,
          height: "100%",
          borderRadius: 2,
          background: color,
          transition: "left 0.6s ease, right 0.6s ease, width 0.6s ease",
          ...(clamped >= 0
            ? { left: "50%", width: `${widthPct}%` }
            : { right: "50%", width: `${widthPct}%` }),
        }}
      />
    </div>
  );
}

// ─── Stat Card ───────────────────────────────────────────────────────────────
function StatCard({
  label,
  value,
  sub,
  accent,
  sparkData,
  badgePct,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: string;
  sparkData?: number[];
  badgePct?: number;
}) {
  return (
    <div
      className="liquid-glass"
      style={{
        borderRadius: 16,
        padding: "16px 20px",
        display: "flex",
        flexDirection: "column",
        gap: 6,
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 2,
          background: accent || "rgba(123,57,252,0.5)",
          borderRadius: "16px 16px 0 0",
        }}
      />
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <span
          className="font-manrope"
          style={{
            fontSize: 11,
            color: "rgba(255,255,255,0.55)",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            fontWeight: 600,
          }}
        >
          {label}
        </span>
        {badgePct !== undefined && <PnLBadge pct={badgePct} size="sm" />}
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
        }}
      >
        <span
          className="font-inter"
          style={{
            fontSize: 22,
            fontWeight: 700,
            color: accent && badgePct !== undefined ? accent : "#fff",
            letterSpacing: "-0.02em",
            fontVariantNumeric: "tabular-nums",
            textShadow:
              badgePct !== undefined
                ? `0 0 16px ${badgePct >= 0 ? "rgba(34,197,94,0.35)" : "rgba(239,68,68,0.35)"}`
                : "none",
          }}
        >
          {value}
        </span>
        {sparkData && (
          <Sparkline data={sparkData} color={accent || "#7b39fc"} />
        )}
      </div>
      {sub && (
        <span
          className="font-inter"
          style={{ fontSize: 12, color: accent || "#b89cfd" }}
        >
          {sub}
        </span>
      )}
    </div>
  );
}

// ─── Order Book Visualizer ────────────────────────────────────────────────────
function OrderBookViz({ price }: { price: number | null }) {
  const levels = 8;
  const bids = Array.from({ length: levels }, (_, i) => ({
    price: (price || 50000) - (i + 1) * 12,
    size: Math.random() * 3 + 0.1,
  }));
  const asks = Array.from({ length: levels }, (_, i) => ({
    price: (price || 50000) + (i + 1) * 12,
    size: Math.random() * 3 + 0.1,
  }));
  const maxSize = Math.max(
    ...bids.map((b) => b.size),
    ...asks.map((a) => a.size),
  );

  return (
    <div style={{ fontSize: 11, fontFamily: "monospace" }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr auto 1fr",
          gap: "2px 8px",
          alignItems: "center",
          marginBottom: 4,
        }}
      >
        <span style={{ color: "rgba(255,255,255,0.4)", textAlign: "right" }}>
          SIZE
        </span>
        <span style={{ color: "rgba(255,255,255,0.4)", textAlign: "center" }}>
          PRICE
        </span>
        <span style={{ color: "rgba(255,255,255,0.4)" }}>SIZE</span>
      </div>
      {Array.from({ length: levels }, (_, i) => (
        <div
          key={i}
          style={{
            display: "grid",
            gridTemplateColumns: "1fr auto 1fr",
            gap: "1px 8px",
            alignItems: "center",
            marginBottom: 2,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "flex-end",
              gap: 4,
            }}
          >
            <div
              style={{
                height: 14,
                background: "rgba(34,197,94,0.25)",
                width: `${(bids[i].size / maxSize) * 60}px`,
                borderRadius: 2,
                marginRight: 4,
              }}
            />
            <span style={{ color: "#22c55e" }}>{bids[i].size.toFixed(3)}</span>
          </div>
          <span
            style={{
              color: "rgba(255,255,255,0.6)",
              textAlign: "center",
              minWidth: 80,
            }}
          >
            {bids[i].price.toFixed(1)}
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <span style={{ color: "#ef4444" }}>{asks[i].size.toFixed(3)}</span>
            <div
              style={{
                height: 14,
                background: "rgba(239,68,68,0.25)",
                width: `${(asks[i].size / maxSize) * 60}px`,
                borderRadius: 2,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Watchlist Card ────────────────────────────────────────────────────────
function WatchlistCard({
  sym,
  price,
  history,
  active,
  onClick,
}: {
  sym: string;
  price: number | null;
  history: number[];
  active: boolean;
  onClick: () => void;
}) {
  const change =
    history.length >= 2
      ? ((history[history.length - 1] - history[0]) / history[0]) * 100
      : 0;
  const isUp = change >= 0;
  const color = isUp ? "#22c55e" : "#ef4444";
  const display = sym.replace("USDT", "");

  return (
    <button
      onClick={onClick}
      className={active ? "liquid-glass-active" : "liquid-glass"}
      style={{
        textAlign: "left",
        borderRadius: 14,
        padding: "14px 16px",
        cursor: "pointer",
        fontFamily: "inherit",
        transition: "all 0.2s",
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span
          className="font-manrope"
          style={{
            fontWeight: 700,
            fontSize: 13,
            color: active ? "#cbb3ff" : "#fff",
          }}
        >
          {display}
        </span>
        {history.length >= 2 && (
          <span style={{ fontSize: 11, fontWeight: 700, color }}>
            {isUp ? "▲" : "▼"} {Math.abs(change).toFixed(2)}%
          </span>
        )}
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
        }}
      >
        <span
          className="font-inter"
          style={{
            fontSize: 16,
            fontWeight: 700,
            fontFamily: "monospace",
            color: "#fff",
          }}
        >
          {price
            ? `$${price.toLocaleString(undefined, { maximumFractionDigits: price < 10 ? 4 : 2 })}`
            : "—"}
        </span>
        {history.length >= 2 && (
          <Sparkline data={history} color={color} height={28} />
        )}
      </div>
    </button>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function Home() {
  const [symbol, setSymbol] = useState("BTCUSDT");
  const [side, setSide] = useState<"BUY" | "SELL">("BUY");
  const [orderType, setOrderType] = useState<"MARKET" | "LIMIT">("MARKET");
  const [quantity, setQuantity] = useState("");
  const [price, setPrice] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<OrderResponse | null>(null);
  const [account, setAccount] = useState<AccountInfo | null>(null);
  const [positions, setPositions] = useState<Position[]>([]);
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [priceHistory, setPriceHistory] = useState<PricePoint[]>([]);
  const [balanceHistory, setBalanceHistory] = useState<number[]>([]);
  const [activeTab, setActiveTab] = useState<"order" | "positions" | "book">(
    "order",
  );
  const [orderCount, setOrderCount] = useState(0);
  const [pnlHistory, setPnlHistory] = useState<number[]>([]);
  const [tick, setTick] = useState(0);
  const bookIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Watchlist prices for all instruments
  const [watchPrices, setWatchPrices] = useState<Record<string, number | null>>(
    Object.fromEntries(WATCHLIST.map((s) => [s, null])),
  );
  const [watchHistory, setWatchHistory] = useState<Record<string, number[]>>(
    Object.fromEntries(WATCHLIST.map((s) => [s, []])),
  );

  const fetchAccountData = useCallback(async () => {
    try {
      const [accountRes, positionsRes] = await Promise.all([
        fetch("/api/account"),
        fetch("/api/positions"),
      ]);
      const accountData = await accountRes.json();
      const positionsData = await positionsRes.json();

      if (accountData.success) {
        setAccount(accountData.account);
        setBalanceHistory((prev) => [
          ...prev.slice(-29),
          accountData.account.totalWalletBalance,
        ]);
        setPnlHistory((prev) => [
          ...prev.slice(-29),
          accountData.account.totalUnrealizedProfit,
        ]);
      }
      if (positionsData.success) setPositions(positionsData.positions);
    } catch (err) {
      console.error("Failed to fetch account data:", err);
    }
  }, []);

  // Fetch prices for all watchlist symbols
  const fetchWatchlistPrices = useCallback(async () => {
    try {
      const results = await Promise.all(
        WATCHLIST.map((s) =>
          fetch(`/api/price?symbol=${s}`)
            .then((r) => r.json())
            .catch(() => null),
        ),
      );
      const now = new Date().toLocaleTimeString();

      setWatchPrices((prev) => {
        const next = { ...prev };
        results.forEach((data, i) => {
          if (data?.success) next[WATCHLIST[i]] = data.price;
        });
        return next;
      });

      setWatchHistory((prev) => {
        const next = { ...prev };
        results.forEach((data, i) => {
          if (data?.success) {
            next[WATCHLIST[i]] = [
              ...(prev[WATCHLIST[i]] || []).slice(-29),
              data.price,
            ];
          }
        });
        return next;
      });

      // update active symbol's price + history
      const activeIdx = WATCHLIST.indexOf(symbol);
      if (activeIdx >= 0 && results[activeIdx]?.success) {
        const p = results[activeIdx].price;
        setCurrentPrice(p);
        setPriceHistory((prev) => [
          ...prev.slice(-59),
          { time: now, price: p },
        ]);
      } else {
        // active symbol not in watchlist - fetch separately
        const r = await fetch(`/api/price?symbol=${symbol}`)
          .then((res) => res.json())
          .catch(() => null);
        if (r?.success) {
          setCurrentPrice(r.price);
          setPriceHistory((prev) => [
            ...prev.slice(-59),
            { time: now, price: r.price },
          ]);
        }
      }
    } catch (err) {
      console.error("Failed to fetch watchlist prices:", err);
    }
  }, [symbol]);

  // Reset chart history when switching active symbol
  useEffect(() => {
    setPriceHistory([]);
    setCurrentPrice(watchPrices[symbol] ?? null);
  }, [symbol]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchAccountData();
    fetchWatchlistPrices();
    const accountInterval = setInterval(fetchAccountData, 10000);
    const priceInterval = setInterval(fetchWatchlistPrices, 5000);
    bookIntervalRef.current = setInterval(() => setTick((t) => t + 1), 3000);
    return () => {
      clearInterval(accountInterval);
      clearInterval(priceInterval);
      if (bookIntervalRef.current) clearInterval(bookIntervalRef.current);
    };
  }, [fetchAccountData, fetchWatchlistPrices]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    const orderData: any = {
      symbol: symbol.toUpperCase(),
      side,
      type: orderType,
      quantity: parseFloat(quantity),
    };
    if (orderType === "LIMIT" && price) orderData.price = parseFloat(price);

    try {
      const response = await fetch("/api/place-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(orderData),
      });
      const data = await response.json();
      setResult(data);
      if (data.success) {
        setOrderCount((c) => c + 1);
        setTimeout(fetchAccountData, 1200);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const marginUsed = account
    ? (account.totalInitialMargin / (account.totalMarginBalance || 1)) * 100
    : 0;

  // PnL as a % of wallet balance — gives the stat card a meaningful badge
  const pnlPctOfBalance =
    account && account.totalWalletBalance > 0
      ? (account.totalUnrealizedProfit / account.totalWalletBalance) * 100
      : 0;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700&family=Cabin:wght@400;500;600&family=Inter:wght@400;500;600;700&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html, body { height: 100%; background: #0a0a1a; }
        body {
          color: #fff;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
          min-height: 100vh;
          overflow-x: hidden;
        }
        .font-manrope { font-family: 'Manrope', sans-serif; }
        .font-cabin { font-family: 'Cabin', sans-serif; }
        .font-inter { font-family: 'Inter', sans-serif; }

        ::selection { background: rgba(123,57,252,0.35); }
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(123,57,252,0.4); border-radius: 4px; }

        input[type="text"], input[type="number"] {
          background: rgba(20,14,38,0.45);
          border: 1px solid rgba(164,132,215,0.35);
          border-radius: 10px;
          color: #fff;
          font-size: 14px;
          padding: 10px 14px;
          width: 100%;
          outline: none;
          transition: border-color 0.2s;
          font-family: inherit;
          backdrop-filter: blur(12px);
        }
        input[type="text"]:focus, input[type="number"]:focus {
          border-color: rgba(123,57,252,0.7);
          box-shadow: 0 0 0 3px rgba(123,57,252,0.12);
        }
        input::placeholder { color: rgba(255,255,255,0.3); }

        /* ── Liquid glass: layered frosted purple surface ── */
        .liquid-glass {
          background: linear-gradient(135deg, rgba(85,80,110,0.42) 0%, rgba(43,35,68,0.32) 100%);
          backdrop-filter: blur(20px) saturate(160%);
          -webkit-backdrop-filter: blur(20px) saturate(160%);
          border: 1px solid rgba(164,132,215,0.35);
          box-shadow:
            inset 0 1px 1px rgba(255,255,255,0.18),
            inset 0 -1px 10px rgba(123,57,252,0.08),
            0 8px 32px rgba(20,10,40,0.35);
        }
        .liquid-glass-active {
          background: linear-gradient(135deg, rgba(123,57,252,0.32) 0%, rgba(85,80,110,0.35) 100%);
          backdrop-filter: blur(20px) saturate(160%);
          -webkit-backdrop-filter: blur(20px) saturate(160%);
          border: 1px solid rgba(164,132,215,0.6);
          box-shadow:
            inset 0 1px 1px rgba(255,255,255,0.25),
            inset 0 -1px 10px rgba(123,57,252,0.18),
            0 8px 32px rgba(123,57,252,0.18);
        }

        .tab-btn {
          background: none;
          border: none;
          color: rgba(255,255,255,0.5);
          font-size: 13px;
          font-weight: 600;
          padding: 8px 16px;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s;
          font-family: 'Manrope', sans-serif;
        }
        .tab-btn.active {
          background: rgba(123,57,252,0.25);
          color: #cbb3ff;
        }
        .tab-btn:hover:not(.active) { color: rgba(255,255,255,0.85); }

        @keyframes pulse-ring {
          0% { transform: scale(0.8); opacity: 1; }
          100% { transform: scale(2); opacity: 0; }
        }
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .fade-in { animation: fadeSlideIn 0.3s ease forwards; }
        .live-dot {
          width: 8px; height: 8px; border-radius: 50%;
          background: #22c55e;
          position: relative; display: inline-block;
        }
        .live-dot::after {
          content: '';
          position: absolute; top: -3px; left: -3px;
          width: 14px; height: 14px; border-radius: 50%;
          background: rgba(34,197,94,0.4);
          animation: pulse-ring 1.5s ease-out infinite;
        }

        @media (prefers-reduced-motion: reduce) {
          .live-dot::after, .fade-in { animation: none; }
        }
      `}</style>

      {/* ── Full-screen video background, opaque (no overlay) ── */}
      <video
        autoPlay
        loop
        muted
        playsInline
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100vw",
          height: "100vh",
          objectFit: "cover",
          zIndex: 1,
        }}
        src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260210_031346_d87182fb-b0af-4273-84d1-c6fd17d6bf0f.mp4"
      />

      <div
        suppressHydrationWarning
        style={{
          position: "relative",
          zIndex: 1,
          maxWidth: 1400,
          margin: "0 auto",
          padding: "24px 20px",
        }}
      >
        {/* ── Header ─────────────────────────────────────────────────── */}
        <header
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 32,
          }}
        >
          <div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                marginBottom: 4,
              }}
            >
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  background: "linear-gradient(135deg, #7b39fc, #2b2344)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 18,
                }}
              >
                ⚡
              </div>
              <h1
                className="font-manrope"
                style={{
                  fontSize: 22,
                  fontWeight: 800,
                  background:
                    "linear-gradient(90deg, #cbb3ff, #7b39fc, #5b21d6)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  letterSpacing: "-0.02em",
                }}
              >
                Akash Futures
              </h1>
            </div>
            <p
              className="font-manrope"
              style={{
                fontSize: 12,
                color: "rgba(255,255,255,0.45)",
                letterSpacing: "0.05em",
              }}
            >
              BINANCE TESTNET · DEMO
            </p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div
              className="liquid-glass"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                borderRadius: 20,
                padding: "6px 12px",
              }}
            >
              <span className="live-dot" />
              <span
                className="font-manrope"
                style={{ fontSize: 12, color: "#22c55e", fontWeight: 600 }}
              >
                LIVE
              </span>
            </div>
            {currentPrice && (
              <div style={{ textAlign: "right" }}>
                <div
                  className="font-manrope"
                  style={{
                    fontSize: 11,
                    color: "rgba(255,255,255,0.45)",
                    marginBottom: 1,
                  }}
                >
                  {symbol}
                </div>
                <div
                  className="font-inter"
                  style={{
                    fontSize: 18,
                    fontWeight: 700,
                    color: "#cbb3ff",
                    fontVariantNumeric: "tabular-nums",
                    letterSpacing: "-0.02em",
                  }}
                >
                  ${currentPrice.toLocaleString()}
                </div>
              </div>
            )}
          </div>
        </header>

        {/* ── Watchlist Grid ─────────────────────────────────────────── */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(5, 1fr)",
            gap: 12,
            marginBottom: 20,
          }}
        >
          {WATCHLIST.map((sym) => (
            <WatchlistCard
              key={sym}
              sym={sym}
              price={watchPrices[sym]}
              history={watchHistory[sym] || []}
              active={symbol === sym}
              onClick={() => setSymbol(sym)}
            />
          ))}
        </div>

        {/* ── Stats Row ──────────────────────────────────────────────── */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 12,
            marginBottom: 20,
          }}
        >
          <StatCard
            label="Wallet Balance"
            value={account ? `$${account.totalWalletBalance.toFixed(2)}` : "—"}
            sub={
              account
                ? `Margin: $${account.totalMarginBalance.toFixed(2)}`
                : undefined
            }
            accent="#7b39fc"
            sparkData={balanceHistory}
          />
          <StatCard
            label="Unrealized PnL"
            value={
              account
                ? `${pnlPrefix(account.totalUnrealizedProfit)}$${Math.abs(account.totalUnrealizedProfit).toFixed(2)}`
                : "—"
            }
            sub={
              account
                ? account.totalUnrealizedProfit >= 0
                  ? "▲ Profitable"
                  : "▼ In drawdown"
                : undefined
            }
            accent={
              account ? pnlColor(account.totalUnrealizedProfit) : "#7b39fc"
            }
            sparkData={pnlHistory}
            badgePct={account ? pnlPctOfBalance : undefined}
          />
          <StatCard
            label="Margin Used"
            value={account ? `${marginUsed.toFixed(1)}%` : "—"}
            sub={
              account
                ? `$${account.totalInitialMargin.toFixed(2)} of $${account.totalMarginBalance.toFixed(2)}`
                : undefined
            }
            accent="#a78bfa"
          />
          <StatCard
            label="Open Positions"
            value={String(positions.length)}
            sub={`${orderCount} orders placed`}
            accent="#cbb3ff"
          />
        </div>

        {/* ── Main Grid ─────────────────────────────────────────────── */}
        <div
          style={{ display: "grid", gridTemplateColumns: "340px 1fr", gap: 16 }}
        >
          {/* Left: Order Panel */}
          <div
            className="liquid-glass"
            style={{ borderRadius: 20, padding: 24 }}
          >
            {/* Symbol input */}
            <div style={{ marginBottom: 20 }}>
              <label
                className="font-manrope"
                style={{
                  fontSize: 11,
                  color: "rgba(255,255,255,0.5)",
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  display: "block",
                  marginBottom: 8,
                  fontWeight: 600,
                }}
              >
                Instrument
              </label>
              <input
                type="text"
                value={symbol}
                onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                placeholder="BTCUSDT"
                suppressHydrationWarning
              />
            </div>

            {/* Tab Bar */}
            <div
              className="liquid-glass"
              style={{
                display: "flex",
                borderRadius: 10,
                padding: 3,
                marginBottom: 20,
              }}
            >
              {(["order", "positions", "book"] as const).map((tab) => (
                <button
                  key={tab}
                  className={`tab-btn${activeTab === tab ? " active" : ""}`}
                  style={{ flex: 1 }}
                  onClick={() => setActiveTab(tab)}
                  suppressHydrationWarning
                >
                  {tab === "order"
                    ? "Order"
                    : tab === "positions"
                      ? "Positions"
                      : "Book"}
                </button>
              ))}
            </div>

            {/* ── Order Form ── */}
            {activeTab === "order" && (
              <form onSubmit={handleSubmit} className="fade-in">
                {/* Side */}
                <div style={{ marginBottom: 16 }}>
                  <label
                    className="font-manrope"
                    style={{
                      fontSize: 11,
                      color: "rgba(255,255,255,0.5)",
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      display: "block",
                      marginBottom: 8,
                      fontWeight: 600,
                    }}
                  >
                    Side
                  </label>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: 8,
                    }}
                  >
                    {(["BUY", "SELL"] as const).map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setSide(s)}
                        suppressHydrationWarning
                        className="font-cabin"
                        style={{
                          padding: "12px",
                          border: "none",
                          borderRadius: 12,
                          cursor: "pointer",
                          fontWeight: 600,
                          fontSize: 14,
                          transition: "all 0.2s",
                          background:
                            side === s
                              ? s === "BUY"
                                ? "linear-gradient(135deg, #16a34a, #22c55e)"
                                : "linear-gradient(135deg, #b91c1c, #ef4444)"
                              : "rgba(255,255,255,0.06)",
                          color: side === s ? "#fff" : "rgba(255,255,255,0.4)",
                          boxShadow:
                            side === s
                              ? s === "BUY"
                                ? "0 4px 20px rgba(34,197,94,0.3)"
                                : "0 4px 20px rgba(239,68,68,0.3)"
                              : "none",
                          transform: side === s ? "scale(1.02)" : "scale(1)",
                        }}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Type */}
                <div style={{ marginBottom: 16 }}>
                  <label
                    className="font-manrope"
                    style={{
                      fontSize: 11,
                      color: "rgba(255,255,255,0.5)",
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      display: "block",
                      marginBottom: 8,
                      fontWeight: 600,
                    }}
                  >
                    Order Type
                  </label>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: 8,
                    }}
                  >
                    {(["MARKET", "LIMIT"] as const).map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setOrderType(t)}
                        suppressHydrationWarning
                        className="font-cabin"
                        style={{
                          padding: "10px",
                          border: "1px solid",
                          borderRadius: 10,
                          cursor: "pointer",
                          fontWeight: 600,
                          fontSize: 13,
                          transition: "all 0.2s",
                          borderColor:
                            orderType === t
                              ? "rgba(123,57,252,0.6)"
                              : "rgba(164,132,215,0.25)",
                          background:
                            orderType === t
                              ? "rgba(123,57,252,0.18)"
                              : "rgba(255,255,255,0.04)",
                          color:
                            orderType === t
                              ? "#cbb3ff"
                              : "rgba(255,255,255,0.5)",
                        }}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Quantity */}
                <div style={{ marginBottom: 16 }}>
                  <label
                    className="font-manrope"
                    style={{
                      fontSize: 11,
                      color: "rgba(255,255,255,0.5)",
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      display: "block",
                      marginBottom: 8,
                      fontWeight: 600,
                    }}
                  >
                    Quantity
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    placeholder="0.001"
                    required
                    suppressHydrationWarning
                  />
                  {currentPrice && quantity && (
                    <div
                      className="font-inter"
                      style={{
                        fontSize: 11,
                        color: "rgba(255,255,255,0.4)",
                        marginTop: 4,
                      }}
                    >
                      ≈ $
                      {(
                        parseFloat(quantity || "0") * (currentPrice || 0)
                      ).toLocaleString(undefined, {
                        maximumFractionDigits: 2,
                      })}{" "}
                      USDT
                    </div>
                  )}
                </div>

                {/* Price (LIMIT) */}
                {orderType === "LIMIT" && (
                  <div style={{ marginBottom: 16 }} className="fade-in">
                    <label
                      className="font-manrope"
                      style={{
                        fontSize: 11,
                        color: "rgba(255,255,255,0.5)",
                        letterSpacing: "0.08em",
                        textTransform: "uppercase",
                        display: "block",
                        marginBottom: 8,
                        fontWeight: 600,
                      }}
                    >
                      Limit Price
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      placeholder={currentPrice?.toFixed(0) || "50000"}
                      required
                      suppressHydrationWarning
                    />
                  </div>
                )}

                {/* Submit */}
                <button
                  type="submit"
                  disabled={loading}
                  suppressHydrationWarning
                  className="font-cabin"
                  style={{
                    width: "100%",
                    padding: "14px",
                    border: "none",
                    borderRadius: 12,
                    fontWeight: 600,
                    fontSize: 16,
                    cursor: loading ? "not-allowed" : "pointer",
                    transition: "all 0.2s",
                    background: loading
                      ? "rgba(255,255,255,0.1)"
                      : side === "BUY"
                        ? "linear-gradient(135deg, #16a34a 0%, #22c55e 50%, #4ade80 100%)"
                        : "linear-gradient(135deg, #b91c1c 0%, #ef4444 50%, #f87171 100%)",
                    color: "#fff",
                    boxShadow: loading
                      ? "none"
                      : side === "BUY"
                        ? "0 8px 32px rgba(34,197,94,0.4)"
                        : "0 8px 32px rgba(239,68,68,0.4)",
                    transform: loading ? "scale(0.98)" : "scale(1)",
                    letterSpacing: "0.02em",
                  }}
                >
                  {loading ? "⏳ Placing…" : `${side} ${orderType}`}
                </button>

                {/* Result */}
                {result && (
                  <div
                    className="fade-in liquid-glass"
                    style={{
                      marginTop: 16,
                      padding: 16,
                      borderRadius: 12,
                      borderColor: result.success
                        ? "rgba(34,197,94,0.3)"
                        : "rgba(239,68,68,0.3)",
                    }}
                  >
                    <div
                      className="font-manrope"
                      style={{
                        fontWeight: 700,
                        marginBottom: 8,
                        color: result.success ? "#22c55e" : "#ef4444",
                        fontSize: 13,
                      }}
                    >
                      {result.success ? "✓ Order Filled" : "✗ Order Failed"}
                    </div>
                    {result.success && result.order ? (
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: 4,
                          fontSize: 12,
                        }}
                      >
                        {[
                          ["ID", result.order.orderId],
                          ["Status", result.order.status],
                          ["Qty Filled", result.order.executedQty],
                          result.order.avgPrice && [
                            "Avg Price",
                            `$${result.order.avgPrice}`,
                          ],
                        ]
                          .filter(Boolean)
                          .map(([k, v]: any) => (
                            <div
                              key={k}
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                              }}
                            >
                              <span style={{ color: "rgba(255,255,255,0.5)" }}>
                                {k}
                              </span>
                              <span
                                style={{
                                  color: "#fff",
                                  fontFamily: "monospace",
                                }}
                              >
                                {v}
                              </span>
                            </div>
                          ))}
                      </div>
                    ) : (
                      <p style={{ color: "#ef4444", fontSize: 12 }}>
                        {result.error}
                      </p>
                    )}
                  </div>
                )}
                {error && (
                  <div
                    className="liquid-glass fade-in"
                    style={{
                      marginTop: 12,
                      padding: 12,
                      borderRadius: 10,
                      borderColor: "rgba(239,68,68,0.3)",
                      fontSize: 12,
                      color: "#ef4444",
                    }}
                  >
                    {error}
                  </div>
                )}
              </form>
            )}

            {/* ── Positions Tab ── */}
            {activeTab === "positions" && (
              <div className="fade-in">
                {positions.length === 0 ? (
                  <div
                    className="font-inter"
                    style={{
                      textAlign: "center",
                      padding: "40px 0",
                      color: "rgba(255,255,255,0.3)",
                      fontSize: 13,
                    }}
                  >
                    No open positions
                  </div>
                ) : (
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 10,
                    }}
                  >
                    {positions
                      .filter((pos) => Math.abs(pos.positionAmt) > 1e-8)
                      .map((pos, i) => {
                        const notional =
                          Math.abs(pos.positionAmt) * (pos.entryPrice || 0);
                        const leverageNum =
                          parseFloat(String(pos.leverage)) || 1;
                        const marginForPos =
                          notional / Math.max(leverageNum, 1);
                        const roiPct =
                          marginForPos > 0
                            ? ((pos.unrealizedProfit || 0) / marginForPos) * 100
                            : 0;

                        const formatPrice = (
                          value: number | null | undefined,
                        ) =>
                          value && !isNaN(value) ? `$${value.toFixed(2)}` : "—";

                        const closePosition = async () => {
                          try {
                            const res = await fetch("/api/place-order", {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({
                                symbol: pos.symbol,
                                side: pos.positionAmt > 0 ? "SELL" : "BUY", // opposite side
                                type: "MARKET",
                                quantity: Math.abs(pos.positionAmt),
                              }),
                            });
                            const data = await res.json();
                            if (data.success) {
                              alert(`Position closed!`);
                              fetchAccountData(); // refresh after a short delay
                              setTimeout(fetchAccountData, 500);
                            } else {
                              alert(`Failed to close: ${data.error}`);
                            }
                          } catch (err: any) {
                            alert(`Error: ${err.message}`);
                          }
                        };

                        return (
                          <div
                            key={i}
                            className="liquid-glass"
                            style={{ borderRadius: 12, padding: 14 }}
                          >
                            {/* Header... */}
                            <div
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                marginBottom: 10,
                              }}
                            >
                              <div
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 8,
                                }}
                              >
                                <span
                                  className="font-manrope"
                                  style={{
                                    fontWeight: 700,
                                    color: "#cbb3ff",
                                    fontSize: 14,
                                  }}
                                >
                                  {pos.symbol}
                                </span>
                                <span
                                  style={{
                                    fontSize: 11,
                                    fontWeight: 700,
                                    padding: "2px 8px",
                                    borderRadius: 6,
                                    background:
                                      pos.positionAmt > 0
                                        ? "rgba(34,197,94,0.2)"
                                        : "rgba(239,68,68,0.2)",
                                    color:
                                      pos.positionAmt > 0
                                        ? "#22c55e"
                                        : "#ef4444",
                                  }}
                                >
                                  {pos.positionAmt > 0 ? "LONG" : "SHORT"}{" "}
                                  {Math.abs(pos.positionAmt)}
                                </span>
                              </div>
                              <div
                                style={{
                                  display: "flex",
                                  flexDirection: "column",
                                  alignItems: "flex-end",
                                  gap: 3,
                                }}
                              >
                                <span
                                  style={{
                                    fontSize: 14,
                                    fontWeight: 700,
                                    fontFamily: "monospace",
                                    color: pnlColor(pos.unrealizedProfit || 0),
                                  }}
                                >
                                  {pnlPrefix(pos.unrealizedProfit || 0)}$
                                  {Math.abs(pos.unrealizedProfit || 0).toFixed(
                                    2,
                                  )}
                                </span>
                                <PnLBadge pct={roiPct} size="sm" />
                              </div>
                            </div>

                            {/* Details grid */}
                            <div
                              style={{
                                display: "grid",
                                gridTemplateColumns: "1fr 1fr",
                                gap: 6,
                                fontSize: 11,
                              }}
                            >
                              <div>
                                <div
                                  style={{
                                    color: "rgba(255,255,255,0.4)",
                                    marginBottom: 2,
                                  }}
                                >
                                  Entry
                                </div>
                                <div
                                  style={{
                                    color: "#fff",
                                    fontFamily: "monospace",
                                  }}
                                >
                                  {formatPrice(pos.entryPrice)}
                                </div>
                              </div>
                              <div>
                                <div
                                  style={{
                                    color: "rgba(255,255,255,0.4)",
                                    marginBottom: 2,
                                  }}
                                >
                                  Mark
                                </div>
                                <div
                                  style={{
                                    color: "#fff",
                                    fontFamily: "monospace",
                                  }}
                                >
                                  {formatPrice(pos.markPrice)}
                                </div>
                              </div>
                              <div>
                                <div
                                  style={{
                                    color: "rgba(255,255,255,0.4)",
                                    marginBottom: 2,
                                  }}
                                >
                                  Liq.
                                </div>
                                <div
                                  style={{
                                    color: "#fff",
                                    fontFamily: "monospace",
                                  }}
                                >
                                  {formatPrice(pos.liquidationPrice)}
                                </div>
                              </div>
                              <div>
                                <div
                                  style={{
                                    color: "rgba(255,255,255,0.4)",
                                    marginBottom: 2,
                                  }}
                                >
                                  Leverage
                                </div>
                                <div
                                  style={{
                                    color: "#fff",
                                    fontFamily: "monospace",
                                  }}
                                >
                                  {pos.leverage ? `${pos.leverage}x` : "—"}
                                </div>
                              </div>
                            </div>

                            {/* ROI bar */}
                            <div style={{ marginTop: 10 }}>
                              <div
                                style={{
                                  display: "flex",
                                  justifyContent: "space-between",
                                  fontSize: 10,
                                  color: "rgba(255,255,255,0.35)",
                                  marginBottom: 4,
                                }}
                              >
                                <span>-100%</span>
                                <span>ROI</span>
                                <span>+100%</span>
                              </div>
                              <RoiBar roiPct={roiPct} />
                            </div>

                            {/* 👇 CLOSE POSITION BUTTON - ADD THIS */}
                            <button
                              onClick={closePosition}
                              style={{
                                marginTop: 12,
                                width: "100%",
                                padding: "8px 12px",
                                background: "#ef4444",
                                border: "none",
                                borderRadius: 8,
                                color: "#fff",
                                cursor: "pointer",
                                fontWeight: 600,
                                fontSize: 12,
                                transition: "all 0.2s",
                              }}
                              onMouseEnter={(e) =>
                                (e.currentTarget.style.background = "#dc2626")
                              }
                              onMouseLeave={(e) =>
                                (e.currentTarget.style.background = "#ef4444")
                              }
                            >
                              Close Position
                            </button>
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>
            )}

            {/* ── Order Book Tab ── */}
            {activeTab === "book" && (
              <div className="fade-in" key={tick}>
                <OrderBookViz price={currentPrice} />
                <div
                  className="liquid-glass"
                  style={{
                    marginTop: 16,
                    textAlign: "center",
                    padding: "10px",
                    borderRadius: 10,
                  }}
                >
                  <div
                    className="font-manrope"
                    style={{
                      fontSize: 11,
                      color: "rgba(255,255,255,0.45)",
                      marginBottom: 4,
                    }}
                  >
                    SPREAD
                  </div>
                  <div
                    style={{
                      fontSize: 18,
                      fontWeight: 700,
                      color: "#cbb3ff",
                      fontFamily: "monospace",
                    }}
                  >
                    {currentPrice
                      ? `$${(currentPrice * 0.0001).toFixed(2)}`
                      : "—"}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right: Analytics */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Price Chart */}
            <div
              className="liquid-glass"
              style={{ borderRadius: 20, padding: 24 }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 16,
                }}
              >
                <div>
                  <div
                    className="font-manrope"
                    style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}
                  >
                    {symbol} Price
                  </div>
                  <div
                    className="font-inter"
                    style={{
                      fontSize: 11,
                      color: "rgba(255,255,255,0.4)",
                      marginTop: 2,
                    }}
                  >
                    Live feed · updates every 5s
                  </div>
                </div>
                {priceHistory.length >= 2 && (
                  <PnLBadge
                    pct={
                      ((priceHistory[priceHistory.length - 1].price -
                        priceHistory[0].price) /
                        priceHistory[0].price) *
                      100
                    }
                  />
                )}
              </div>
              <PriceChart data={priceHistory} />
            </div>

            {/* Bottom Row: Account detail + Margin gauge */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 16,
              }}
            >
              {/* Account Breakdown */}
              <div
                className="liquid-glass"
                style={{ borderRadius: 20, padding: 24 }}
              >
                <div
                  className="font-manrope"
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    marginBottom: 16,
                    color: "#fff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <span>Account Breakdown</span>
                  {account && (
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 500,
                        color: "rgba(255,255,255,0.45)",
                        fontFamily: "monospace",
                      }}
                    >
                      Net PnL:{" "}
                      <span
                        style={{
                          color: pnlColor(account.totalUnrealizedProfit),
                          fontWeight: 700,
                        }}
                      >
                        {pnlPrefix(account.totalUnrealizedProfit)}$
                        {Math.abs(account.totalUnrealizedProfit).toFixed(2)}
                      </span>
                    </span>
                  )}
                </div>
                {account ? (
                  <div
                    style={{ display: "flex", flexDirection: "column", gap: 0 }}
                  >
                    {[
                      {
                        label: "Wallet Balance",
                        value: `$${account.totalWalletBalance.toFixed(2)}`,
                        color: "#7b39fc",
                        pct: 100,
                      },
                      {
                        label: "Margin Balance",
                        value: `$${account.totalMarginBalance.toFixed(2)}`,
                        color: "#a78bfa",
                        pct:
                          (account.totalMarginBalance /
                            account.totalWalletBalance) *
                          100,
                      },
                      {
                        label: "Initial Margin",
                        value: `$${account.totalInitialMargin.toFixed(2)}`,
                        color: "#cbb3ff",
                        pct:
                          (account.totalInitialMargin /
                            account.totalWalletBalance) *
                          100,
                      },
                      {
                        label: "Maint. Margin",
                        value: `$${account.totalMaintMargin.toFixed(2)}`,
                        color: "#22c55e",
                        pct:
                          (account.totalMaintMargin /
                            account.totalWalletBalance) *
                          100,
                      },
                    ].map(({ label, value, color, pct }) => (
                      <div
                        key={label}
                        style={{
                          padding: "10px 0",
                          borderBottom: "1px solid rgba(164,132,215,0.12)",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            marginBottom: 6,
                          }}
                        >
                          <span
                            className="font-inter"
                            style={{
                              fontSize: 12,
                              color: "rgba(255,255,255,0.5)",
                            }}
                          >
                            {label}
                          </span>
                          <span
                            style={{
                              fontSize: 12,
                              fontWeight: 600,
                              color: "#fff",
                              fontFamily: "monospace",
                            }}
                          >
                            {value}
                          </span>
                        </div>
                        <div
                          style={{
                            height: 3,
                            background: "rgba(255,255,255,0.08)",
                            borderRadius: 2,
                          }}
                        >
                          <div
                            style={{
                              height: "100%",
                              width: `${Math.min(pct, 100)}%`,
                              background: color,
                              borderRadius: 2,
                              transition: "width 0.6s ease",
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div
                    className="font-inter"
                    style={{
                      color: "rgba(255,255,255,0.3)",
                      fontSize: 13,
                      textAlign: "center",
                      paddingTop: 40,
                    }}
                  >
                    Loading…
                  </div>
                )}
              </div>

              {/* Margin Health Gauge */}
              <div
                className="liquid-glass"
                style={{
                  borderRadius: 20,
                  padding: 24,
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                <div
                  className="font-manrope"
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    marginBottom: 16,
                    color: "#fff",
                  }}
                >
                  Margin Health
                </div>
                <div
                  style={{
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <div
                    style={{ position: "relative", width: 160, height: 100 }}
                  >
                    <svg viewBox="0 0 160 90" width="160" height="90">
                      <path
                        d="M 10 80 A 70 70 0 0 1 150 80"
                        fill="none"
                        stroke="rgba(255,255,255,0.1)"
                        strokeWidth="12"
                        strokeLinecap="round"
                      />
                      <path
                        d="M 10 80 A 70 70 0 0 1 150 80"
                        fill="none"
                        stroke={
                          marginUsed > 80
                            ? "#ef4444"
                            : marginUsed > 50
                              ? "#f59e0b"
                              : "#7b39fc"
                        }
                        strokeWidth="12"
                        strokeLinecap="round"
                        strokeDasharray={`${Math.PI * 70}`}
                        strokeDashoffset={`${Math.PI * 70 * (1 - Math.min(marginUsed, 100) / 100)}`}
                        style={{
                          transition:
                            "stroke-dashoffset 0.8s ease, stroke 0.4s",
                        }}
                      />
                    </svg>
                    <div
                      style={{
                        position: "absolute",
                        bottom: 0,
                        left: "50%",
                        transform: "translateX(-50%)",
                        textAlign: "center",
                      }}
                    >
                      <div
                        style={{
                          fontSize: 28,
                          fontWeight: 800,
                          fontVariantNumeric: "tabular-nums",
                          color:
                            marginUsed > 80
                              ? "#ef4444"
                              : marginUsed > 50
                                ? "#f59e0b"
                                : "#cbb3ff",
                          lineHeight: 1,
                        }}
                      >
                        {marginUsed.toFixed(1)}%
                      </div>
                      <div
                        className="font-manrope"
                        style={{
                          fontSize: 10,
                          color: "rgba(255,255,255,0.4)",
                          marginTop: 2,
                        }}
                      >
                        USED
                      </div>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 16, marginTop: 20 }}>
                    {[
                      ["Safe", "#7b39fc", "0–50%"],
                      ["Caution", "#f59e0b", "50–80%"],
                      ["Risk", "#ef4444", "80%+"],
                    ].map(([l, c, r]) => (
                      <div key={l} style={{ textAlign: "center" }}>
                        <div
                          style={{
                            width: 8,
                            height: 8,
                            borderRadius: 2,
                            background: c,
                            margin: "0 auto 3px",
                          }}
                        />
                        <div
                          className="font-manrope"
                          style={{
                            fontSize: 10,
                            color: "rgba(255,255,255,0.45)",
                          }}
                        >
                          {l}
                        </div>
                        <div
                          style={{
                            fontSize: 9,
                            color: "rgba(255,255,255,0.3)",
                          }}
                        >
                          {r}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div
                    className="liquid-glass"
                    style={{
                      marginTop: 20,
                      width: "100%",
                      padding: "10px 14px",
                      borderRadius: 10,
                      fontSize: 12,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                      }}
                    >
                      <span
                        className="font-inter"
                        style={{ color: "rgba(255,255,255,0.45)" }}
                      >
                        Available Margin
                      </span>
                      <span style={{ color: "#fff", fontFamily: "monospace" }}>
                        {account
                          ? `$${(account.totalMarginBalance - account.totalInitialMargin).toFixed(2)}`
                          : "—"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer
          className="font-manrope"
          style={{
            marginTop: 32,
            textAlign: "center",
            color: "rgba(255,255,255,0.35)",
            fontSize: 11,
          }}
        >
          Binance Futures Testnet · All trades simulated · Watchlist refreshes
          every 5 seconds
        </footer>
      </div>
    </>
  );
}
