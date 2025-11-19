import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import Header from './components/Header';
import SwapCard from './components/SwapCard';
import UDTSection from './components/UDTSection';
import LaunchPoolModal from './components/LaunchPoolModal';
import About from './pages/About';
import { mockUDTs, mockPools } from './mockData';
import { Pool } from './types';

function Home() {
  const [pools, setPools] = useState<Pool[]>(mockPools);
  const [showPools, setShowPools] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleLaunchPool = (udtTypeHash: string, k: number, totalSupply: number) => {
    const newPool: Pool = {
      id: `pool${pools.length + 1}`,
      udtTypeHash,
      k,
      totalSupply,
      remainingTokens: totalSupply,
      ckbBalance: 0,
      creator: '0xcurrentUser', // Mock current user
    };
    setPools([...pools, newPool]);
    alert(`Pool launched for UDT ${udtTypeHash} with K=${k}, Total Supply=${totalSupply}`);
  };

  return (
    <>
      <Header onLaunchPool={() => setIsModalOpen(true)} onToggleExplore={() => setShowPools(!showPools)} showPools={showPools} />
      <main className="max-w-7xl mx-auto px-4 py-8 flex-1 flex items-center justify-center">

        {!showPools && (
          <div className="flex items-center justify-center w-full">
            <SwapCard udts={mockUDTs} pools={pools} />
          </div>
        )}

        {/* Explore pools toggled in header - no in-main toggle */}

        {showPools && (
          <div className="mt-8 w-full">
            {mockUDTs.map((udt) => (
              <UDTSection
                key={udt.typeHash}
                udt={udt}
                pools={pools.filter(p => p.udtTypeHash === udt.typeHash)}
              />
            ))}
          </div>
        )}

        {mockUDTs.length === 0 && (
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
      <LaunchPoolModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        udts={mockUDTs}
        onLaunch={handleLaunchPool}
      />
    </>
  );
}

function App() {
  return (
    <Router>
      <div className="flex flex-col min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={
            <>
              <Header onLaunchPool={() => {}} onToggleExplore={() => {}} showPools={false} />
              <About />
            </>
          } />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
