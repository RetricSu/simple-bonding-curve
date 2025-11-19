import React from "react";
import ConnectWallet from "./ConnectWallet";

interface HeaderProps {
  onLaunchPool: () => void;
  onToggleExplore: () => void;
  showPools: boolean;
}

const Header: React.FC<HeaderProps> = ({
  onLaunchPool,
  onToggleExplore,
  showPools,
}) => {
  return (
    <header className="bg-white shadow-sm border-b border-gray-100 px-4 py-3">
      <div className="max-w-7xl mx-auto flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center shadow-md ring-1 ring-gray-50">
            <span className="text-white font-bold text-sm">SC</span>
          </div>
          <div>
            <h1 className="text-xl font-semibold text-gray-900">
              Bonding Curve
            </h1>
          </div>
          <button
            onClick={onToggleExplore}
            className={`text-pink-600 hover:text-pink-700 px-3 py-1 rounded-full font-medium transition-colors duration-200 ${
              showPools ? "bg-pink-50" : ""
            }`}
          >
            Explore Pools
          </button>
          <button
            onClick={onLaunchPool}
            className={`text-pink-600 hover:text-pink-700 px-3 py-1 rounded-full font-medium transition-colors duration-200 flex justify-center items-center`}
          >
            <svg
              className="w-4 h-4"
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
            <span>Launch Pool</span>
          </button>
          <button
            className={`text-pink-600 hover:text-pink-700 px-3 py-1 rounded-full font-medium transition-colors duration-200}`}
          >
            About
          </button>
        </div>
        <div className="flex justify-end gap-3 items-center">
          <ConnectWallet />
        </div>
      </div>
    </header>
  );
};

export default Header;
