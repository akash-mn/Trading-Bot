// app/api/price/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getBinanceClient } from '@/lib/binance';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    const symbol = request.nextUrl.searchParams.get('symbol');
    if (!symbol) {
      return NextResponse.json(
        { success: false, error: 'Symbol parameter is required' },
        { status: 400 }
      );
    }
    
    const client = getBinanceClient();
    const priceData = await client.getSymbolPrice(symbol.toUpperCase());
    
    return NextResponse.json({
      success: true,
      symbol: priceData.symbol,
      price: parseFloat(priceData.price),
    });
  } catch (error: any) {
    logger.error({ type: 'PRICE_ERROR', error: error.message }, 'Failed to fetch price');
    return NextResponse.json(
      { success: false, error: error.response?.data?.msg || error.message },
      { status: error.response?.status || 500 }
    );
  }
}