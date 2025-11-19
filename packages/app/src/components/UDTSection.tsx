import React from "react";
import { UDT, Pool } from "../types";
import PoolCard from "./PoolCard";

interface UDTSectionProps {
  udt: UDT;
  pools: Pool[];
}

const UDTSection: React.FC<UDTSectionProps> = ({ udt, pools }) => {
  return (
    <section className="mb-8">
      <div className="flex items-center space-x-3 mb-6">
        <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
          <span className="text-white font-bold text-sm">
            {udt.symbol.slice(0, 2)}
          </span>
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{udt.name}</h2>
          <p className="text-gray-500 text-sm">
            {udt.symbol} • {udt.typeHash.slice(0, 10)}...
            {udt.typeHash.slice(-8)}
          </p>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {pools.map((pool) => (
          <PoolCard key={pool.id} pool={pool} />
        ))}
      </div>
    </section>
  );
};

export default UDTSection;
