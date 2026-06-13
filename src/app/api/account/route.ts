// app/api/account/route.ts
import { NextResponse } from 'next/server';
import { getBinanceClient } from '@/lib/binance';
import { logger } from '@/lib/logger';

export async function GET() {
  try {
    const client = getBinanceClient();
    const account = await client.getAccount();
    
    // Calculate total wallet balance
    const totalWalletBalance = parseFloat(account.totalWalletBalance);
    const totalUnrealizedProfit = parseFloat(account.totalUnrealizedProfit);
    const totalMarginBalance = parseFloat(account.totalMarginBalance);
    
    return NextResponse.json({
      success: true,
      account: {
        canTrade: account.canTrade,
        canWithdraw: account.canWithdraw,
        canDeposit: account.canDeposit,
        totalWalletBalance,
        totalUnrealizedProfit,
        totalMarginBalance,
        totalInitialMargin: parseFloat(account.totalInitialMargin),
        totalMaintMargin: parseFloat(account.totalMaintMargin),
        assets: account.assets.filter((a: any) => parseFloat(a.walletBalance) > 0),
      },
    });
  } catch (error: any) {
    logger.error({ type: 'ACCOUNT_ERROR', error: error.message }, 'Failed to fetch account');
    return NextResponse.json(
      { success: false, error: error.response?.data?.msg || error.message },
      { status: error.response?.status || 500 }
    );
  }
}