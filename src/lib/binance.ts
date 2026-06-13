// lib/binance.ts
import axios, { AxiosInstance } from 'axios';
import crypto from 'crypto';
import { logApiRequest, logApiResponse, logApiError } from './logger';

const BASE_URL = process.env.BINANCE_TESTNET_BASE_URL || 'https://testnet.binancefuture.com';

class BinanceFuturesClient {
  private apiKey: string;
  private apiSecret: string;
  private client: AxiosInstance;

  constructor(apiKey: string, apiSecret: string) {
    this.apiKey = apiKey;
    this.apiSecret = apiSecret;
    this.client = axios.create({
      baseURL: BASE_URL,
      timeout: 10000,
    });
  }

  private generateSignature(queryString: string): string {
    return crypto.createHmac('sha256', this.apiSecret).update(queryString).digest('hex');
  }

  private async request(method: string, endpoint: string, params: any = {}) {
    const timestamp = Date.now();
    const recvWindow = 5000;
    
    const requestParams = {
      timestamp,
      recvWindow,
      ...params,
    };

    const queryString = Object.keys(requestParams)
      .map(key => `${key}=${requestParams[key]}`)
      .join('&');
    
    const signature = this.generateSignature(queryString);
    const fullQueryString = `${queryString}&signature=${signature}`;
    const url = `${endpoint}?${fullQueryString}`;

    logApiRequest(endpoint, method, { ...requestParams, signature: '[GENERATED]' });

    try {
      const response = await this.client.request({
        method,
        url,
        headers: {
          'X-MBX-APIKEY': this.apiKey,
          'Content-Type': 'application/json',
        },
      });
      logApiResponse(endpoint, response.data);
      return response.data;
    } catch (error: any) {
      logApiError(endpoint, error.response?.data || error);
      throw error;
    }
  }

  async placeOrder(params: {
    symbol: string;
    side: string;
    type: string;
    quantity: number;
    price?: number;
  }) {
    const orderParams: any = {
      symbol: params.symbol,
      side: params.side,
      type: params.type,
      quantity: params.quantity.toString(),
      newOrderRespType: 'RESULT',
    };

    if (params.type === 'LIMIT' && params.price) {
      orderParams.price = params.price.toString();
      orderParams.timeInForce = 'GTC';
    }

    return this.request('POST', '/fapi/v1/order', orderParams);
  }

  async getAccount() {
    return this.request('GET', '/fapi/v2/account', {});
  }

  async getPositions() {
    const account = await this.getAccount();
    return account.positions.filter((p: any) => parseFloat(p.positionAmt) !== 0);
  }

  async getSymbolPrice(symbol: string) {
    return this.request('GET', '/fapi/v1/ticker/price', { symbol });
  }
}

let clientInstance: BinanceFuturesClient | null = null;

export function getBinanceClient(): BinanceFuturesClient {
  if (!clientInstance) {
    const apiKey = process.env.BINANCE_API_KEY;
    const apiSecret = process.env.BINANCE_SECRET_KEY;
    
    if (!apiKey || !apiSecret) {
      throw new Error('Missing Binance API credentials. Please check your .env.local file');
    }
    
    clientInstance = new BinanceFuturesClient(apiKey, apiSecret);
  }
  return clientInstance;
}