
import React from 'react';

const Header: React.FC = () => {
    return (
        <header className="px-4 py-3 sm:px-6 lg:px-8 border-b border-gray-800">
            <div className="flex items-center justify-between">
                {/* Left Section */}
                <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-3">
                        <svg className="h-8 w-auto text-cyan-glow" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M3 12H6L9 3L15 21L18 12H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                            <span className="hidden sm:inline">منصة </span>WaveSight
                        </h1>
                    </div>
                </div>

                {/* Right Section */}
                <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                         <span className="relative flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                        </span>
                        <span className="text-xs sm:text-sm font-medium text-green-300">
                            <span className="hidden sm:inline">متصل بـ </span>Binance<span className="hidden sm:inline"> Futures</span>
                        </span>
                    </div>
                </div>
            </div>
        </header>
    );
};

export default Header;
