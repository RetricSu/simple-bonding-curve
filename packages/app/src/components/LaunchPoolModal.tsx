import React, { useState } from "react";
import { getNetwork } from "../utils/env";
import { ccc } from "@ckb-ccc/connector-react";
import { BondingCurveContract } from "../utils/contract";

interface LaunchPoolModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const LaunchPoolModal: React.FC<LaunchPoolModalProps> = ({
  isOpen,
  onClose,
}) => {
  const signer = ccc.useSigner();

  const [udtTypeHash, setUdtTypeHash] = useState("");
  const [k, setK] = useState("");
  const [totalSupply, setTotalSupply] = useState("");
  const [initialCkbDeposit, setInitialCkbDeposit] = useState("");

  const getSignerUdtTypeHash = async () => {
    if (!signer) return;
    const addressObj = await signer.getRecommendedAddressObj();
    const lockScript = addressObj.script;
    const script = ccc.Script.from({
      codeHash: lockScript.codeHash,
      hashType: lockScript.hashType,
      args: lockScript.args,
    });
    setUdtTypeHash(script.hash());
  };

  React.useEffect(() => {
    getSignerUdtTypeHash();
  }, [signer]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const network = getNetwork();
    const contract = new BondingCurveContract(network);
    const txHash = await contract.createPoolCell(
      signer!,
      BigInt(+initialCkbDeposit * 10 ** 8),
      BigInt(k),
      BigInt(totalSupply)
    );

    alert(
      `Pool launched! Transaction hash: ${txHash} Please refresh the page.`
    );

    setK("");
    setTotalSupply("");
    setInitialCkbDeposit("");
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 px-6 py-4">
          <h2 className="text-xl font-bold text-white">Launch New Pool</h2>
        </div>
        <form onSubmit={handleSubmit} className="p-6">
          <div className="space-y-6">
            <div>Your UDT Script Hash: {udtTypeHash}</div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                K Parameter
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                value={k}
                onChange={(e) => setK(e.target.value)}
                placeholder="1.0"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors duration-200"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Bonding curve steepness parameter
              </p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Total Supply
              </label>
              <input
                type="number"
                min="1"
                value={totalSupply}
                onChange={(e) => setTotalSupply(e.target.value)}
                placeholder="1000000"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors duration-200"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Maximum tokens in this pool
              </p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Initial CKB Deposit（in CKB）
              </label>
              <input
                type="number"
                min="1"
                value={initialCkbDeposit}
                onChange={(e) => setInitialCkbDeposit(e.target.value)}
                placeholder="1000000"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors duration-200"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Initial CKB to fund the bonding curve
              </p>
            </div>
          </div>

          <div className="flex space-x-3 mt-8">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-200 text-gray-800 py-3 px-4 rounded-lg font-semibold hover:bg-gray-300 transition-colors duration-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 bg-gradient-to-r from-blue-500 to-purple-600 text-white py-3 px-4 rounded-lg font-semibold hover:from-blue-600 hover:to-purple-700 transition-all duration-200 flex items-center justify-center space-x-2"
            >
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
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
              <span>Launch Pool</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LaunchPoolModal;
