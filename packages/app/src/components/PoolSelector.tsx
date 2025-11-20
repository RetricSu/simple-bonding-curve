import React from "react";
import { Pool } from "../types";

interface PoolSelectorProps {
  availablePools: Pool[];
  selectedPoolId: string | null;
  onPoolChange: (poolId: string) => void;
  selectedPool: Pool | undefined;
}

const PoolSelector: React.FC<PoolSelectorProps> = ({
  availablePools,
  selectedPoolId,
  onPoolChange,
  selectedPool,
}) => {
  const generateCurvePath = (kParam: number | undefined) => {
    if (!kParam) return "M0,40 L100,0";
    const k = Math.max(0.2, Math.min(4, kParam));
    const points = Array.from({ length: 8 }).map((_, i) => {
      const x = (i / 7) * 100;
      const t = x / 100;
      // sample curve: y = 40 - (t^k)*40 (so 0..40)
      const y = 40 - Math.pow(t, k) * 40;
      return `${x},${y.toFixed(2)}`;
    });
    return `M${points.join(" L")}`;
  };

  return (
    <div className="mt-3 flex items-center justify-between space-x-4">
      <div className="flex flex-col justify-start space-y-3 text-left">
        <div className="text-sm text-gray-500">Select Pool</div>
        <select
          value={selectedPoolId || ""}
          onChange={(e) => onPoolChange(e.target.value)}
          className="text-sm px-3 py-1 rounded-full bg-gray-50 border border-gray-200"
        >
          {availablePools.map((p, index) => (
            <option key={p.id} value={p.id}>{`#${index} • k=${p.k}`}</option>
          ))}
        </select>
      </div>

      <div className="w-40 h-16 bg-gradient-to-r from-gray-100 to-white rounded-lg flex items-center justify-center shadow-inner text-xs text-gray-500">
        {selectedPool ? (
          <div className="flex items-center space-x-3 px-2">
            <div>
              <div className="text-sm font-medium">k={selectedPool.k}</div>
              <div className="text-xs text-gray-400">
                Remain {selectedPool.remainingTokens.toLocaleString()}
              </div>
            </div>
            <div className="w-20 h-12">
              {/* Tiny curve preview */}
              <svg viewBox="0 0 100 40" width="100" height="40">
                <path
                  d={generateCurvePath(selectedPool.k)}
                  fill="none"
                  stroke="#ec4899"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          </div>
        ) : (
          <div>No pool selected</div>
        )}
      </div>
    </div>
  );
};

export default PoolSelector;
