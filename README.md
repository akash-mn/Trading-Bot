# 🤖 Binance Futures Trading Bot — Node.js + Next.js

A clean, production-ready trading bot for the **Binance Futures Testnet (USDT-M)**.  
Built with Node.js (CLI) and Next.js (Web Dashboard) instead of Python, leveraging 2+ years of real-world Node/Next experience.

---

## Project Structure

```
trading-bot/
├── src/
│   ├── lib/
│   │   ├── binanceClient.js   # Low-level REST client (HMAC signing, request/response logging)
│   │   ├── orderService.js    # Business logic — validate → place → normalise
│   │   ├── validators.js      # Input validation with descriptive error messages
│   │   └── logger.js          # Winston logger (file + console)
│   ├── cli/
│   │   └── index.js           # Commander.js CLI entry point
│   └── app/
│       ├── api/order/route.js # Next.js API route (POST + GET)
│       ├── layout.js
│       └── page.js            # Web dashboard UI
├── logs/
│   ├── combined.log           # All logs
│   └── errors.log             # Errors only
├── .env.example
├── next.config.js
├── package.json
└── README.md
```

---

## Setup

### 1. Get Testnet Credentials

1. Go to **https://testnet.binancefuture.com**
2. Sign in with GitHub
3. Click **"API Key"** → generate a new key pair
4. Copy your **API Key** and **Secret Key**

### 2. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` and fill in your credentials:

```env
BINANCE_API_KEY=your_api_key_here
BINANCE_API_SECRET=your_api_secret_here
BINANCE_BASE_URL=https://testnet.binancefuture.com
```

### 3. Install Dependencies

```bash
npm install
```

---

## CLI Usage

All CLI commands use:

```bash
node src/cli/index.js <command> [options]
```

### Check Connectivity

```bash
node src/cli/index.js ping
```

### Place a MARKET Order

```bash
node src/cli/index.js place \
  --symbol BTCUSDT \
  --side BUY \
  --type MARKET \
  --quantity 0.001
```

### Place a LIMIT Order

```bash
node src/cli/index.js place \
  --symbol ETHUSDT \
  --side SELL \
  --type LIMIT \
  --quantity 0.05 \
  --price 3450
```

### Place a STOP_MARKET Order (Bonus)

```bash
node src/cli/index.js place \
  --symbol BTCUSDT \
  --side SELL \
  --type STOP_MARKET \
  --quantity 0.001 \
  --stop-price 95000
```

### Check Order Status

```bash
node src/cli/index.js status --symbol BTCUSDT --order-id 4532891023
```

### List Open Orders

```bash
node src/cli/index.js open-orders --symbol BTCUSDT
```

### Cancel an Order

```bash
node src/cli/index.js cancel --symbol BTCUSDT --order-id 4532892118
```

---

## Web Dashboard

Start the Next.js dev server:

```bash
npm run dev
```

Then open **http://localhost:3000** in your browser.

The dashboard lets you:
- Select a symbol from a dropdown
- Toggle BUY / SELL with colour-coded buttons
- Choose order type (MARKET / LIMIT / STOP_MARKET)
- Enter quantity, price, and stop price
- See the full order response in real time
- View a live activity log in the same page

---

## Sample CLI Output

```
══════════════════════════════════════════════════
  🤖  Binance Futures Bot — PLACE ORDER
══════════════════════════════════════════════════

  📋  Request Summary:
     Symbol       : BTCUSDT
     Side         : BUY
     Type         : MARKET
     Quantity     : 0.001
     Price        : —
     Stop Price   : —

  ✅  ORDER PLACED SUCCESSFULLY

  📦  Order Details:
     Order ID       : 4532891023
     Symbol         : BTCUSDT
     Side           : BUY
     Type           : MARKET
     Status         : FILLED
     Avg Price      : 96847.50
     Orig Qty       : 0.001
     Executed Qty   : 0.001
     Created At     : 2024-12-01T09:14:03.921Z
```

---

## Logging

Logs are written to the `logs/` directory:

| File | Contents |
|------|----------|
| `logs/combined.log` | Every API request, response, order event, and error |
| `logs/errors.log` | Errors only (validation failures, API errors, network issues) |

Each entry is structured JSON:

```json
{
  "level": "info",
  "message": "ORDER PLACED SUCCESSFULLY",
  "orderId": 4532891023,
  "status": "FILLED",
  "timestamp": "2024-12-01 09:14:03"
}
```

---

## Architecture Decisions

| Concern | Choice | Reason |
|---------|--------|--------|
| Language | Node.js + Next.js | 2+ years production experience |
| CLI | Commander.js | Equivalent to Python's argparse — clean, typed, well-documented |
| HTTP | Axios | Built-in timeout, interceptors, clean error objects |
| Logging | Winston | Structured JSON logs, multiple transports, log rotation |
| Web UI | Next.js App Router | Zero-config SSR + API routes in one project |
| Auth | HMAC-SHA256 (built-in `crypto`) | No extra deps, matches Binance spec exactly |

---

## Assumptions

- Orders are placed on **USDT-M perpetual futures**, not spot or COIN-M.
- `timeInForce` for all LIMIT orders defaults to `GTC` (Good Till Cancelled).
- The testnet resets periodically; order IDs in the sample logs are illustrative.
- Quantity precision follows testnet defaults — if Binance returns a filter error, reduce precision (e.g. `0.001` not `0.0013`).

---

## Requirements

Node.js ≥ 18  
npm ≥ 9
