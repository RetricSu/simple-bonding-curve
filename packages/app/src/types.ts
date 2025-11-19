export interface UDT {
  typeHash: string;
  name: string;
  symbol: string;
}

export interface Pool {
  id: string;
  udtTypeHash: string;
  k: number;
  totalSupply: number;
  remainingTokens: number;
  ckbBalance: number;
  creator: string;
}
