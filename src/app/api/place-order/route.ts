// app/api/place-order/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getBinanceClient } from '@/lib/binance';
import { OrderSchema } from '@/lib/validators';
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate input
    const validationResult = OrderSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Validation failed', 
          details: validationResult.error.errors 
        },
        { status: 400 }
      );
    }
    
    const { symbol, side, type, quantity, price } = validationResult.data;
    
    // Get Binance client and place order
    const client = getBinanceClient();
    const orderParams: any = {
      symbol: symbol.toUpperCase(),
      side,
      type,
      quantity,
    };
    
    if (type === 'LIMIT' && price) {
      orderParams.price = price;
    }
    
    logger.info({ type: 'USER_ORDER', order: orderParams }, 'Placing order');
    
    const orderResponse = await client.placeOrder(orderParams);
    
    return NextResponse.json({
      success: true,
      order: {
        orderId: orderResponse.orderId,
        status: orderResponse.status,
        executedQty: orderResponse.executedQty,
        cumQty: orderResponse.cumQty,
        avgPrice: orderResponse.avgPrice,
        price: orderResponse.price,
        origQty: orderResponse.origQty,
        symbol: orderResponse.symbol,
        side: orderResponse.side,
        type: orderResponse.type,
      },
      rawResponse: orderResponse,
    });
    
  } catch (error: any) {
    logger.error({ type: 'ORDER_ERROR', error: error.response?.data || error.message }, 'Order placement failed');
    
    const errorMessage = error.response?.data?.msg || error.message || 'Failed to place order';
    const errorCode = error.response?.data?.code;
    
    return NextResponse.json(
      { 
        success: false, 
        error: errorMessage,
        code: errorCode,
      },
      { status: error.response?.status || 500 }
    );
  }
}