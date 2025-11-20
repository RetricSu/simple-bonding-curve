import React, { useState } from "react";
import { Pool } from "../types";
import { BondingCurveContract } from "../utils/contract";
import { getNetwork } from "../utils/env";
import { ccc } from "@ckb-ccc/connector-react";

interface PoolCardProps {
  pool: Pool;
}

const PoolCard: React.FC<PoolCardProps> = ({ pool }) => {
  const signer = ccc.useSigner();
  const [activeTab, setActiveTab] = useState<"buy" | "sell">("buy");
  const [amount, setAmount] = useState("");

  const handleSubmit = async () => {
    if (!amount) return;

    const network = getNetwork();
    const contract = new BondingCurveContract(network);
    const poolCell = pool.cell;

    try {
      if (activeTab === "buy") {
        const txHash = await contract.purchase(
          signer!,
          poolCell,
          BigInt(Math.round(+amount))
        );
        alert(`Bought ${amount} tokens from pool ${pool.id}\nTransaction Hash: ${txHash}`);
      } else {
        const txHash = await contract.redeem(
          signer!,
          poolCell,
          BigInt(Math.round(+amount))
        );
        alert(`Sold ${amount} tokens to pool ${pool.id}\nTransaction Hash: ${txHash}`);
      }
      setAmount("");
    } catch (error) {
      alert(`Transaction failed: ${error}`);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden hover:shadow-xl transition-shadow duration-300">
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            Pool #{pool.id.slice(4)}
          </h3>
          <div className="flex items-center space-x-1">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span className="text-sm text-gray-500">Active</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-500 uppercase tracking-wide">
              K Parameter
            </p>
            <p className="text-lg font-semibold text-gray-900">{pool.k}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-500 uppercase tracking-wide">
              Total Supply
            </p>
            <p className="text-lg font-semibold text-gray-900">
              {pool.totalSupply.toLocaleString()}
            </p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-500 uppercase tracking-wide">
              Remaining
            </p>
            <p className="text-lg font-semibold text-gray-900">
              {pool.remainingTokens.toLocaleString()}
            </p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-500 uppercase tracking-wide">
              CKB Balance
            </p>
            <p className="text-lg font-semibold text-gray-900">
              {pool.ckbBalance.toLocaleString()}
            </p>
          </div>
        </div>

        <div className="mb-4">
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setActiveTab("buy")}
              className={`flex-1 py-2 px-4 rounded-md font-medium transition-colors duration-200 ${
                activeTab === "buy"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Buy
            </button>
            <button
              onClick={() => setActiveTab("sell")}
              className={`flex-1 py-2 px-4 rounded-md font-medium transition-colors duration-200 ${
                activeTab === "sell"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Sell
            </button>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Amount
            </label>
            <div className="relative">
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors duration-200"
              />
              <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                <span className="text-gray-500 text-sm">UDT</span>
              </div>
            </div>
          </div>

          <button
            onClick={handleSubmit}
            disabled={!amount}
            className={`w-full py-3 px-4 rounded-lg font-semibold transition-colors duration-200 flex items-center justify-center space-x-2 ${
              activeTab === "buy"
                ? "bg-green-600 hover:bg-green-700 text-white disabled:bg-gray-300"
                : "bg-red-600 hover:bg-red-700 text-white disabled:bg-gray-300"
            }`}
          >
            {activeTab === "buy" ? (
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                />
              </svg>
            ) : (
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M20 12H4"
                />
              </svg>
            )}
            <span>{activeTab === "buy" ? "Buy Tokens" : "Sell Tokens"}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default PoolCard;
