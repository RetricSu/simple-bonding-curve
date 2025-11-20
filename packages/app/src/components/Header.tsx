import React from "react";
import { Link, useLocation } from "react-router-dom";
import ConnectWallet from "./ConnectWallet";

const Header: React.FC = () => {
  const location = useLocation();

  return (
    <header className="bg-white shadow-sm border-b border-gray-100 px-4 py-3">
      <div className="max-w-7xl mx-auto flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <Link to="/" className="flex items-center space-x-4">
            <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center shadow-md ring-1 ring-gray-50">
              <span className="text-white font-bold text-sm">SC</span>
            </div>
            <div>
              <h1 className="text-xl font-semibold text-gray-900">
                Bonding Curve
              </h1>
            </div>
          </Link>
          <Link
            to="/launch-pool"
            className={`text-pink-600 hover:text-pink-700 px-3 py-1 rounded-full font-medium transition-colors duration-200 flex justify-center items-center ${
              location.pathname === "/launch-pool" ? "bg-pink-50" : ""
            }`}
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
            <span>Create New Pool</span>
          </Link>
          <Link
            to="/pools"
            className={`text-pink-600 hover:text-pink-700 px-3 py-1 rounded-full font-medium transition-colors duration-200 ${
              location.pathname === "/pools" ? "bg-pink-50" : ""
            }`}
          >
            Explore Pools
          </Link>

          <Link
            to="/about"
            className={`text-pink-600 hover:text-pink-700 px-3 py-1 rounded-full font-medium transition-colors duration-200 ${
              location.pathname === "/about" ? "bg-pink-50" : ""
            }`}
          >
            About
          </Link>
        </div>
        <div className="flex justify-end gap-3 items-center">
          <ConnectWallet />
        </div>
      </div>
    </header>
  );
};

export default Header;
