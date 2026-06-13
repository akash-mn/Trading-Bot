// app/api/positions/route.ts
import { NextResponse } from 'next/server';
import { getBinanceClient } from '@/lib/binance';
import { logger } from '@/lib/logger';

export async function GET() {
  try {
    const client = getBinanceClient();
    const positions = await client.getPositions();
    
    return NextResponse.json({
      success: true,
      positions: positions.map((pos: any) => ({
        symbol: pos.symbol,
        positionAmt: parseFloat(pos.positionAmt),
        entryPrice: parseFloat(pos.entryPrice),
        markPrice: parseFloat(pos.markPrice),
        unrealizedProfit: parseFloat(pos.unRealizedProfit),
        leverage: pos.leverage,
        liquidationPrice: parseFloat(pos.liquidationPrice),
        positionSide: pos.positionSide,
      })),
    });
  } catch (error: any) {
    logger.error({ type: 'POSITIONS_ERROR', error: error.message }, 'Failed to fetch positions');
    return NextResponse.json(
      { success: false, error: error.response?.data?.msg || error.message },
      { status: error.response?.status || 500 }
    );
  }
}