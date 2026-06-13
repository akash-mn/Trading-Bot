// lib/validators.ts
import { z } from 'zod';

export const OrderSchema = z.object({
  symbol: z.string().min(1, 'Symbol is required').regex(/^[A-Z]+USDT$/, 'Symbol must end with USDT (e.g., BTCUSDT)'),
  side: z.enum(['BUY', 'SELL']),
  type: z.enum(['MARKET', 'LIMIT']),
  quantity: z.number().positive('Quantity must be greater than 0'),
  price: z.number().positive('Price must be greater than 0').optional(),
}).refine(data => {
  if (data.type === 'LIMIT' && !data.price) {
    return false;
  }
  return true;
}, {
  message: 'Price is required for LIMIT orders',
  path: ['price'],
});

export type OrderInput = z.infer<typeof OrderSchema>;