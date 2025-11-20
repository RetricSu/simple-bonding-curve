import React, { useMemo, useState } from "react";
import { UDT, Pool } from "../types";
import { useBalance } from "../hooks/useBalance";
import { BondingCurveContract } from "../utils/contract";
import { getNetwork } from "../utils/env";
import { ccc } from "@ckb-ccc/connector-react";
import {
  calculatePurchaseCost,
  calculateRedemptionReturn,
} from "../utils/price";

interface SwapCardProps {
  udts: UDT[];
  pools: Pool[];
}

const SwapCard: React.FC<SwapCardProps> = ({ udts, pools }) => {
  const signer = ccc.useSigner();
  const { balance, getUdtBalance } = useBalance();

  const [udtBalance, setUdtBalance] = useState<bigint>(BigInt(0));
  const [activeTab, setActiveTab] = useState<"swap" | "limit">("swap");
  const [topAmount, setTopAmount] = useState("");
  const [bottomAmount, setBottomAmount] = useState("");
  const [isReversed, setIsReversed] = useState(true);
  const [selectedUDT, setSelectedUDT] = useState<string>(
    udts[0]?.typeHash || ""
  );
  const [errorMessage, setErrorMessage] = useState<string>("");
  const availablePools = useMemo(
    () => pools.filter((p) => p.udtTypeHash === selectedUDT),
    [pools, selectedUDT]
  );
  const [selectedPoolId, setSelectedPoolId] = useState<string | null>(
    availablePools[0]?.id || null
  );

  // Re-sync pool when UDT changes
  React.useEffect(() => {
    setSelectedPoolId(availablePools[0]?.id || null);
  }, [availablePools]);

  // Clear amounts on UDT/pool changes so old numbers don't remain
  React.useEffect(() => {
    setTopAmount("");
    setBottomAmount("");
    setErrorMessage("");
  }, [selectedUDT, selectedPoolId]);

  // load udt balance when selectedUDT changes
  React.useEffect(() => {
    (async () => {
      if (!getUdtBalance) return;
      const udt = udts.find((u) => u.typeHash === selectedUDT);
      if (!udt) return;
      const udtScript = udt.script;
      const balance = await getUdtBalance(udtScript);
      setUdtBalance(balance);
    })();
  }, [selectedUDT]);

  const selectedPool = pools.find((p) => p.id === selectedPoolId);
  const udtSymbol =
    udts.find((u) => u.typeHash === selectedUDT)?.symbol || "UDT";
  const topSymbol = isReversed ? "CKB" : udtSymbol;
  const bottomSymbol = isReversed ? udtSymbol : "CKB";

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

  const handleSwap = async () => {
    if (!topAmount && !bottomAmount) return;

    const network = getNetwork();
    const contract = new BondingCurveContract(network);
    const poolCell = pools.find((p) => p.id === selectedPoolId)?.cell!;
    if (isReversed) {
      const txHash = await contract.purchase(
        signer!,
        poolCell,
        BigInt(Math.round(+bottomAmount))
      );
      alert(
        `Swapping ${topAmount || bottomAmount} on pool ${
          selectedPoolId || "N/A"
        }\nTransaction Hash: ${txHash}`
      );
    } else {
      const txHash = await contract.redeem(
        signer!,
        poolCell,
        BigInt(Math.round(+topAmount))
      );
      alert(
        `Swapping ${topAmount || bottomAmount} on pool ${
          selectedPoolId || "N/A"
        }\nTransaction Hash: ${txHash}`
      );
    }

    setTopAmount("");
    setBottomAmount("");
    setErrorMessage("");
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="bg-white rounded-2xl p-4 shadow-xl border border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <div className="hidden sm:flex items-center bg-gray-50 px-3 py-1 rounded-full text-sm text-gray-700">
            <button
              onClick={() => setActiveTab("swap")}
              className={`px-3 py-1 rounded-full ${
                activeTab === "swap" ? "bg-white shadow-sm" : ""
              }`}
            >
              Swap
            </button>
            <button
              onClick={() => setActiveTab("limit")}
              className={`px-3 py-1 rounded-full ${
                activeTab === "limit" ? "bg-white shadow-sm" : ""
              }`}
            >
              Limit
            </button>
          </div>

          <div className="flex items-center space-x-3">
            <div>
              {/* Small UDT selector */}
              <select
                value={selectedUDT}
                onChange={(e) => setSelectedUDT(e.target.value)}
                className="px-3 py-1 rounded-full bg-gradient-to-r from-pink-400 to-pink-600 text-white font-semibold text-sm shadow-sm"
              >
                {udts.map((u) => (
                  <option key={u.typeHash} value={u.typeHash}>
                    {u.symbol}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="border border-gray-100 rounded-xl p-6 bg-white">
          {/* Sell */}
          <div className="mb-3">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm text-gray-500">Sell</div>
              <div className="text-sm text-gray-500">
                Balance: {isReversed ? balance : udtBalance.toString()}{" "}
                {topSymbol}
              </div>
            </div>
            <div className="flex items-center bg-gray-50 rounded-lg p-4">
              <div className="flex-1">
                <input
                  type="number"
                  value={topAmount}
                  onChange={(e) => {
                    const v = e.target.value;
                    setTopAmount(v);
                    // top is UDT when not reversed; otherwise top is CKB
                    if (!selectedPool) return;
                    const parsed = Number(v || 0);
                    let calculatedBottom = "0";
                    if (!isReversed) {
                      // top is UDT -> compute CKB as redemption return
                      if (
                        parsed >
                        selectedPool.totalSupply - selectedPool.remainingTokens
                      ) {
                        setErrorMessage(
                          "The tokens to sell exceed the available supply"
                        );
                        setBottomAmount("0");
                        return;
                      }
                      const ckb = calculateRedemptionReturn(
                        parsed,
                        selectedPool.remainingTokens,
                        selectedPool.totalSupply,
                        selectedPool.k
                      );
                      calculatedBottom = ckb > 0 ? ckb.toFixed(6) : "0";
                    } else {
                      // top is CKB -> compute UDT using inverse of purchase cost
                      const udtAmount = calculatePurchaseCost(
                        parsed,
                        selectedPool.remainingTokens,
                        selectedPool.totalSupply,
                        selectedPool.k
                      );
                      calculatedBottom =
                        udtAmount > 0 ? udtAmount.toFixed(6) : "0";
                      if (
                        Number(calculatedBottom) > selectedPool.remainingTokens
                      ) {
                        setErrorMessage("Not enough tokens available to buy");
                        setBottomAmount("0");
                        return;
                      }
                    }
                    setBottomAmount(calculatedBottom);
                    setErrorMessage("");
                  }}
                  placeholder="0.00"
                  disabled={!selectedPool}
                  className="w-full text-4xl font-extralight bg-gray-50 border-0 focus:outline-none"
                />
                <div className="text-xs text-gray-400">
                  ${(Number(topAmount) || 0).toFixed(2)}
                </div>
              </div>

              <div className="ml-4 flex items-center space-x-3">
                <div className="px-3 py-2 bg-pink-500 text-white rounded-lg shadow-sm text-sm font-semibold">
                  {topSymbol}
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-center my-3">
            <button
              onClick={() => {
                // Swap the current values and flip direction
                setTopAmount(bottomAmount);
                setBottomAmount(topAmount);
                setIsReversed(!isReversed);
              }}
              aria-label="Swap inputs"
              title="Swap inputs"
              className={`w-12 h-12 bg-white rounded-full shadow p-2 flex items-center justify-center transform -translate-y-3 transition-transform duration-300 ${
                isReversed ? "rotate-180" : ""
              }`}
              disabled={!selectedPool}
            >
              <svg
                className="w-6 h-6 text-gray-700"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 3v6"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 7l4-4 4 4"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 21v-6"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M16 17l-4 4-4-4"
                />
              </svg>
            </button>
          </div>

          {/* Buy */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm text-gray-500">Buy</div>
              <div className="text-sm text-gray-500">0 {bottomSymbol}</div>
            </div>
            <div className="flex items-center justify-between bg-gray-200 rounded-lg p-4">
              <div className="flex-1">
                <input
                  type="number"
                  value={bottomAmount}
                  placeholder="0.00"
                  disabled={true}
                  className="w-full text-4xl font-extralight bg-gray-150 border-0 focus:outline-none"
                />
                <div className="text-xs text-gray-400">
                  ${(Number(bottomAmount) || 0).toFixed(2)}
                </div>
              </div>

              <div className="ml-4 flex items-center space-x-3">
                <div className="px-3 py-2 bg-white rounded-lg shadow-sm text-sm">
                  {bottomSymbol}
                </div>
              </div>
            </div>

            <div className="mt-3 flex items-center justify-between space-x-4">
              <div className="flex flex-col justify-start space-y-3 text-left">
                <div className="text-sm text-gray-500">Select Pool</div>
                <select
                  value={selectedPoolId || ""}
                  onChange={(e) => setSelectedPoolId(e.target.value)}
                  className="text-sm px-3 py-1 rounded-full bg-gray-50 border border-gray-200"
                >
                  {availablePools.map((p, index) => (
                    <option
                      key={p.id}
                      value={p.id}
                    >{`#${index} • k=${p.k}`}</option>
                  ))}
                </select>
              </div>

              <div className="w-40 h-16 bg-gradient-to-r from-gray-100 to-white rounded-lg flex items-center justify-center shadow-inner text-xs text-gray-500">
                {selectedPool ? (
                  <div className="flex items-center space-x-3 px-2">
                    <div>
                      <div className="text-sm font-medium">
                        k={selectedPool.k}
                      </div>
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
          </div>

          {errorMessage && (
            <div className="mt-3 text-red-500 text-sm text-center">
              {errorMessage}
            </div>
          )}

          <button
            onClick={handleSwap}
            disabled={
              !selectedPool ||
              (Number(topAmount) <= 0 && Number(bottomAmount) <= 0)
            }
            className={`w-full py-3 px-4 rounded-lg font-semibold text-white transition-colors duration-200 ${
              !selectedPool ||
              (Number(topAmount) <= 0 && Number(bottomAmount) <= 0)
                ? "bg-gray-300 cursor-not-allowed"
                : "bg-pink-500 hover:bg-pink-600"
            }`}
          >
            Add funds to swap
          </button>
        </div>
      </div>
    </div>
  );
};

export default SwapCard;
