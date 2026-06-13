// next.config.js
import type { NextConfig } from "next";
const nextConfig: NextConfig = {
  env: {
    BINANCE_API_KEY: process.env.BINANCE_API_KEY,
    BINANCE_SECRET_KEY: process.env.BINANCE_SECRET_KEY,
    BINANCE_TESTNET_BASE_URL: process.env.BINANCE_TESTNET_BASE_URL,
  },
};

export default nextConfig;