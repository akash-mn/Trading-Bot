# ⚡ Akash Futures — Binance Testnet Trading Dashboard

A premium, full-stack crypto futures trading dashboard built with **Next.js 14**, **TypeScript**, and **Tailwind CSS**. Features a live Binance Futures Testnet integration, real-time price feeds, order placement, position tracking, and a stunning liquid-glassmorphism UI with a full-screen video background.

---

## 📸 Preview

> Full-screen purple video background with layered frosted-glass cards overlaid — watchlist, stat cards, live price chart, order panel, and margin health gauge.

---

## 🚀 Features

- **Live Binance Futures Testnet** — real account data, real orders, zero real money
- **Watchlist** — BTC, ETH, BNB, SOL, XRP with live prices, % change, and sparklines
- **Stat Cards** — Wallet Balance, Unrealized PnL (with % of balance badge), Margin Used, Open Positions
- **Live Price Chart** — SVG area chart, updates every 5s, up/down color-coded with glow
- **Order Panel** — Market & Limit orders, BUY/SELL toggle, live USDT value estimate
- **Positions Tab** — Per-position PnL in dollars + ROI% badge, diverging ROI bar (green/red from center), entry/mark/liquidation/leverage breakdown
- **Order Book Tab** — Simulated bid/ask depth with visual size bars
- **Account Breakdown** — Wallet, Margin, Initial, Maintenance bars
- **Margin Health Gauge** — Arc gauge, color-coded Safe/Caution/Risk
- **Liquid Glassmorphism UI** — Layered frosted-glass cards (`backdrop-filter: blur(20px) saturate(160%)`) over a full-screen fixed video background
- **Fully Responsive** — Works on desktop and mobile

---

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS + inline styles |
| Fonts | Manrope · Cabin · Inter (Google Fonts) |
| Charts | Custom SVG (no chart library) |
| Data | Binance Futures Testnet REST API |
| Runtime | Node.js 18+ |

---

## 📁 Project Structure

```
trading-bot/
├── src/app/
│   ├── page.tsx              # Main dashboard component
│   ├── layout.tsx            # Root layout
│   └── globals.css           # Global styles
├── src/app/api/
│   ├── account/
│   │   └── route.ts          # GET /api/account — wallet & margin info
│   ├── positions/
│   │   └── route.ts          # GET /api/positions — open positions
│   ├── price/
│   │   └── route.ts          # GET /api/price?symbol=BTCUSDT — mark price
│   └── place-order/
│       └── route.ts          # POST /api/place-order — submit order
├── public/
│   └── (static assets)
├── .env.local                # API keys (never commit this)
├── package.json
├── tailwind.config.ts
├── tsconfig.json
└── README.md
```

---

## ⚙️ Prerequisites

- **Node.js** v18 or higher
- **npm** v9+ or **yarn** v1.22+
- A free **Binance Futures Testnet** account

---

## 🔑 Getting Binance Testnet API Keys

1. Go to [https://testnet.binancefuture.com](https://testnet.binancefuture.com)
2. Sign in (GitHub login supported)
3. Navigate to **API Key** in the top right menu
4. Click **Create** — copy your **API Key** and **Secret Key** immediately (the secret is shown only once)
5. Testnet accounts are pre-funded with test USDT — no deposit needed

> ⚠️ These keys only work on the testnet. Never use real Binance API keys here.

---

## 📦 Installation

```bash
# 1. Clone the repository
git clone https://github.com/your-username/trading-bot.git
cd trading-bot

# 2. Install dependencies
npm install

# 3. Create environment file
cp .env.example .env.local
```

---

## 🔐 Environment Variables

Create a `.env.local` file in the project root:

```env
# Binance Futures Testnet API credentials
BINANCE_API_KEY=your_testnet_api_key_here
BINANCE_API_SECRET=your_testnet_api_secret_here

# Binance Testnet base URL (do not change)
BINANCE_BASE_URL=https://testnet.binancefuture.com
```

> ✅ `.env.local` is already in `.gitignore` — your keys will never be committed.

---

## 🧪 Running the App

```bash
# Development mode (with hot reload)
npm run dev

# Production build
npm run build
npm start

# Type checking
npm run type-check

# Linting
npm run lint
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🔌 API Routes

All routes are Next.js Route Handlers (`app/api/*/route.ts`) that proxy to Binance Testnet with HMAC-SHA256 signed requests.

### `GET /api/account`
Returns account wallet balances and margin info.

**Response:**
```json
{
  "success": true,
  "account": {
    "totalWalletBalance": 5000.00,
    "totalUnrealizedProfit": 12.34,
    "totalMarginBalance": 5012.34,
    "totalInitialMargin": 250.00,
    "totalMaintMargin": 100.00,
    "assets": [...]
  }
}
```

---

### `GET /api/positions`
Returns all open futures positions (non-zero position amount).

**Response:**
```json
{
  "success": true,
  "positions": [
    {
      "symbol": "BTCUSDT",
      "positionAmt": 0.01,
      "entryPrice": 63500.00,
      "markPrice": 64000.00,
      "unrealizedProfit": 5.00,
      "liquidationPrice": 58000.00,
      "leverage": "10"
    }
  ]
}
```

---

### `GET /api/price?symbol=BTCUSDT`
Returns the current mark price for a symbol.

**Query Parameters:**

| Parameter | Type | Required | Description |
|---|---|---|---|
| `symbol` | string | ✅ | Trading pair e.g. `BTCUSDT` |

**Response:**
```json
{
  "success": true,
  "price": 64038.00
}
```

---

### `POST /api/place-order`
Places a new futures order on the testnet.

**Request Body:**
```json
{
  "symbol": "BTCUSDT",
  "side": "BUY",
  "type": "MARKET",
  "quantity": 0.001,
  "price": 64000
}
```

| Field | Type | Required | Values |
|---|---|---|---|
| `symbol` | string | ✅ | e.g. `BTCUSDT` |
| `side` | string | ✅ | `BUY` \| `SELL` |
| `type` | string | ✅ | `MARKET` \| `LIMIT` |
| `quantity` | number | ✅ | Positive number |
| `price` | number | LIMIT only | Limit price in USDT |

**Response:**
```json
{
  "success": true,
  "order": {
    "orderId": 123456789,
    "status": "FILLED",
    "executedQty": "0.001",
    "avgPrice": "64038.00"
  }
}
```

---

## 🎨 UI Architecture

### Liquid Glass System

All cards use a two-layer glass system defined in `<style>` inside `page.tsx`:

```css
/* Standard glass — purple-tinted frosted surface */
.liquid-glass {
  background: linear-gradient(
    135deg,
    rgba(85, 80, 110, 0.42) 0%,
    rgba(43, 35, 68, 0.32) 100%
  );
  backdrop-filter: blur(20px) saturate(160%);
  border: 1px solid rgba(164, 132, 215, 0.35);
  box-shadow:
    inset 0 1px 1px rgba(255, 255, 255, 0.18),
    inset 0 -1px 10px rgba(123, 57, 252, 0.08),
    0 8px 32px rgba(20, 10, 40, 0.35);
}

/* Active state — stronger purple tint for selected watchlist card */
.liquid-glass-active {
  background: linear-gradient(
    135deg,
    rgba(123, 57, 252, 0.32) 0%,
    rgba(85, 80, 110, 0.35) 100%
  );
  border: 1px solid rgba(164, 132, 215, 0.6);
}
```

### Component Overview

| Component | Description |
|---|---|
| `Sparkline` | Mini SVG line chart with gradient fill |
| `PriceChart` | Full SVG area chart with grid lines and glow filter |
| `PnLBadge` | Colored ▲/▼ percentage pill badge |
| `RoiBar` | Diverging center bar — green right (profit), red left (loss) |
| `StatCard` | Glassmorphic stat card with top accent bar, optional sparkline and PnL badge |
| `WatchlistCard` | Clickable glass card showing symbol, price, % change, sparkline |
| `OrderBookViz` | Bid/ask depth table with proportional size bars |

### Color Palette

| Token | Color | Use |
|---|---|---|
| Primary | `#7b39fc` | Accent bars, active states, gauge safe zone |
| Light Purple | `#cbb3ff` | Headings, price display |
| Mid Purple | `#a78bfa` | Secondary accents |
| Dark Purple | `#2b2344` | Background fallback |
| Glass Border | `rgba(164,132,215,0.35)` | Card borders |
| Profit | `#22c55e` | Green PnL, up ticks |
| Loss | `#ef4444` | Red PnL, down ticks |
| Caution | `#f59e0b` | Margin warning (50–80%) |

---

## 📊 PnL Display Logic

The dashboard shows PnL in three ways:

### 1. Stat Card Badge
Shows PnL as a **percentage of total wallet balance**:
```ts
const pnlPctOfBalance = (totalUnrealizedProfit / totalWalletBalance) * 100;
```

### 2. Per-Position ROI%
Shows **return on margin** — how much you've gained/lost relative to the capital actually at risk for that position:
```ts
const notional = Math.abs(positionAmt) * entryPrice;
const marginForPos = notional / leverage;
const roiPct = (unrealizedProfit / marginForPos) * 100;
```

### 3. ROI Bar
A diverging bar centered at 0, clamped to ±100%:
- Profit → green bar grows **right** from center
- Loss → red bar grows **left** from center

---

## 🔄 Data Refresh Intervals

| Data | Interval |
|---|---|
| Account & positions | Every 10 seconds |
| Watchlist prices (all 5 symbols) | Every 5 seconds |
| Order book simulation | Every 3 seconds |
| Price history chart | Appends each price poll |

---

## 🧩 Supported Trading Pairs

By default the watchlist tracks:

```ts
const WATCHLIST = ["BTCUSDT", "ETHUSDT", "BNBUSDT", "SOLUSDT", "XRPUSDT"];
```

You can add any Binance Futures Testnet symbol to this array. The active symbol (clicked in the watchlist, or typed manually in the Instrument field) drives the price chart and order form.

---

## 🚨 Common Issues

### Video background not showing
- Ensure your browser supports `autoplay` for muted videos (all modern browsers do)
- Check the video URL is accessible from your network
- The video uses `position: fixed` with inline styles — it should always cover the full viewport

### API calls failing (`401 Unauthorized`)
- Double-check your `.env.local` keys match the testnet (not mainnet) keys
- Ensure the API key has **Futures Trading** permissions enabled on the testnet dashboard
- Testnet keys and mainnet keys are completely separate

### `Network Error` on order placement
- Binance Testnet has occasional downtime — check [https://testnet.binancefuture.com](https://testnet.binancefuture.com)
- Verify the symbol exists as a testnet pair (not all pairs are available)
- Check quantity meets minimum notional (`quantity × price > $5` typically)

### Price shows `—` (dash)
- The symbol may not be in the testnet's available pairs
- Try switching to `BTCUSDT` which is always available

### Hydration warning in development
- Suppress with `suppressHydrationWarning` on inputs and dynamic buttons — already included in the code
- This is a browser extension (e.g. form autofill) injecting `fdprocessedid` attributes, not a code bug

---

## 🔒 Security Notes

- **Never commit `.env.local`** — it contains your API secret
- These are **testnet keys only** — they cannot access real funds
- The API secret is never sent to the client — all Binance calls happen server-side in Route Handlers
- HMAC-SHA256 signatures are generated server-side using Node's `crypto` module

---

## 🗺 Roadmap

- [ ] WebSocket price feed (replace REST polling)
- [ ] Candlestick chart (OHLCV)
- [ ] Leverage adjustment slider
- [ ] Stop-loss / take-profit order types
- [ ] Position close button
- [ ] Trade history log
- [ ] PnL history chart (daily/weekly)
- [ ] Mobile-responsive order panel
- [ ] Dark/light theme toggle

---

## 🤝 Contributing

```bash
# Fork the repo and create a feature branch
git checkout -b feature/your-feature-name

# Make your changes, then commit
git commit -m "feat: add candlestick chart"

# Push and open a Pull Request
git push origin feature/your-feature-name
```

Please follow the existing code style — TypeScript strict mode, inline styles for dynamic values, Tailwind for layout utilities.

---

## 📄 License

MIT License — see [LICENSE](LICENSE) for details.

---

## 🙏 Acknowledgements

- [Binance Futures Testnet](https://testnet.binancefuture.com) for the free paper trading API
- [Next.js](https://nextjs.org) for the full-stack React framework
- [Tailwind CSS](https://tailwindcss.com) for utility-first styling
- [Google Fonts](https://fonts.google.com) for Manrope, Cabin, and Inter

---

<p align="center">
  Built with ⚡ by Akash · Binance Testnet · All trades simulated
</p>