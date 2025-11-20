import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import SwapCard from './components/SwapCard';
import About from './pages/About';
import Pools from './pages/Pools';
import LaunchPool from './pages/LaunchPool';
import { Pool, UDT } from './types';
import { BondingCurveContract } from './utils/contract';
import { getNetwork } from './utils/env';

function Home() {
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
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <>
      <Header />
      <div className='flex justify-center mt-10 text-sm text-gray-600'>Note: For simplicity demo purpose, the UDT amount will be rounded into integers when making a transaction.</div>
      <main className="max-w-7xl mx-auto px-4 py-8 flex-1 flex items-center justify-center">
        <div className="flex items-center justify-center w-full">
          <SwapCard udts={udts} pools={pools} />
        </div>
      </main>
    </>
  );
}

function App() {
  return (
    <Router>
      <div className="flex flex-col min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/pools" element={<Pools />} />
          <Route path="/launch-pool" element={<LaunchPool />} />
          <Route path="/about" element={
            <>
              <Header />
              <About />
            </>
          } />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
