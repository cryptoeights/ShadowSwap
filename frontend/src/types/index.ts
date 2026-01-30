export interface Token {
  symbol: string;
  name: string;
  address: string;
  decimals: number;
  logo?: string;
  coingeckoId?: string; // For price synchronization
}

export interface Order {
  id: string;
  owner: string;
  type: 'market' | 'limit';
  direction: 'buy' | 'sell';
  tokenIn: Token;
  tokenOut: Token;
  amountIn: string;
  amountOut?: string;
  limitPrice?: string;
  status: OrderStatus;
  batchId?: number;
  settlementType?: SettlementType;
  timestamp: number;
  expiresAt?: number;
}

export type OrderStatus =
  | 'pending'
  | 'processing'
  | 'executed'
  | 'cancelled'
  | 'expired';

export type SettlementType =
  | 'cow_match'
  | 'uniswap_swap'
  | 'limit_queued';

export interface Batch {
  id: number;
  orderCount: number;
  estimatedVolume: string;
  timeRemaining: number;
  status: 'collecting' | 'processing' | 'settled';
}

export interface BatchResult {
  batchId: number;
  totalOrders: number;
  cowMatches: number;
  uniswapSwaps: number;
  settlements: Settlement[];
}

export interface Settlement {
  orderId: string;
  user: string;
  tokenOut: string;
  amountOut: string;
  settlementType: SettlementType;
  txHash?: string;
}
