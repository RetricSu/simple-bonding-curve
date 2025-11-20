import { ccc } from "@ckb-ccc/connector-react";

export interface UDT {
  typeHash: string;
  name: string;
  symbol: string;
  script: ccc.Script;
}

export interface Pool {
  id: string;
  cell: ccc.Cell;
  udtTypeHash: string;
  udtScript: ccc.Script;
  k: number;
  totalSupply: number;
  remainingTokens: number;
  ckbBalance: number;
  creator: string;
}
