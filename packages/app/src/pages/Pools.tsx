import React, { useState, useEffect } from 'react';
import Header from '../components/Header';
import UDTSection from '../components/UDTSection';
import { mockUDTs, mockPools } from '../mockData';
import { Pool, UDT } from '../types';
import { BondingCurveContract } from '../utils/contract';
import { getNetwork } from '../utils/env';
import { ccc } from '@ckb-ccc/connector-react';

function Pools() {
  const [pools, setPools] = useState<Pool[]>([]);
  const [udts, setUdts] = useState<UDT[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const network = getNetwork();
        const contract = new BondingCurveContract(network);
        const realPools = await contract.getPools();
        const realUdts = await contract.getUDTs(realPools);
        setPools(realPools);
        setUdts(realUdts);
      } catch (error) {
        console.error('Failed to fetch data:', error);
        // Fallback to mock data
        setPools(mockPools);
        setUdts(mockUDTs);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleLaunchPool = (udtTypeHash: string, k: number, totalSupply: number) => {
    const newPool: Pool = {
      id: `pool${pools.length + 1}`,
      udtTypeHash,
      k,
      totalSupply,
      remainingTokens: totalSupply,
      ckbBalance: 0,
      udtScript: ccc.Script.from({
	codeHash: '0x00',
	hashType: 'type',
	args: '0x00',
      }),
      cell: {} as ccc.Cell,
      creator: '0xcurrentUser', // Mock current user
    };
    setPools([...pools, newPool]);
    alert(`Pool launched for UDT ${udtTypeHash} with K=${k}, Total Supply=${totalSupply}`);
  };

  if (loading) {
    return (
      <>
        <Header />
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-lg">Loading...</div>
        </div>
      </>
    );
  }

  return (
    <>
      <Header />
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Explore Pools</h2>
          <p className="text-gray-600">Discover and trade in bonding curve pools</p>
        </div>

        {udts.length > 0 ? (
          <div className="space-y-8">
            {udts.map((udt) => (
              <UDTSection
                key={udt.typeHash}
                udt={udt}
                pools={pools.filter(p => p.udtTypeHash === udt.typeHash)}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="w-24 h-24 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No pools yet</h3>
            <p className="text-gray-500">Launch your first bonding curve pool to get started</p>
          </div>
        )}
      </main>
    </>
  );
}

export default Pools;
