import { UDT, Pool } from './types';

export const mockUDTs: UDT[] = [
  {
    typeHash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
    name: 'My Awesome Token',
    symbol: 'MAT',
  },
  {
    typeHash: '0xfedcba0987654321fedcba0987654321fedcba0987654321fedcba0987654321',
    name: 'Community Coin',
    symbol: 'CMC',
  },
  {
    typeHash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
    name: 'DeFi Protocol',
    symbol: 'DFP',
  },
];

export const mockPools: Pool[] = [
  {
    id: 'pool1',
    udtTypeHash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
    k: 1,
    totalSupply: 1000000,
    remainingTokens: 750000,
    ckbBalance: 250000,
    creator: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e',
  },
  {
    id: 'pool2',
    udtTypeHash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
    k: 2,
    totalSupply: 500000,
    remainingTokens: 300000,
    ckbBalance: 400000,
    creator: '0x8d0c7e8d6b5a4c3b2a1f0e9d8c7b6a5f4e3d2c1b',
  },
  {
    id: 'pool3',
    udtTypeHash: '0xfedcba0987654321fedcba0987654321fedcba0987654321fedcba0987654321',
    k: 1.5,
    totalSupply: 2000000,
    remainingTokens: 1800000,
    ckbBalance: 150000,
    creator: '0x1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p7q8r9s0t1u2v3w4x5y6z7',
  },
  {
    id: 'pool4',
    udtTypeHash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
    k: 0.8,
    totalSupply: 800000,
    remainingTokens: 650000,
    ckbBalance: 180000,
    creator: '0x9f8e7d6c5b4a3928172635f4e3d2c1b0a9f8e7d6c5b4a3928172635f4e3d2c1b',
  },
  {
    id: 'pool5',
    udtTypeHash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
    k: 3,
    totalSupply: 300000,
    remainingTokens: 150000,
    ckbBalance: 450000,
    creator: '0x0f1e2d3c4b5a69788796a5b4c3d2e1f0a9b8c7d6e5f4a3b2c1d0e9f8a7b6c5d4',
  },
];
