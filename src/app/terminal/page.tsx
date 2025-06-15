'use client' 

import React, { useState } from 'react';
import { 
  ChartBarIcon, 
  NewspaperIcon, 
  UserGroupIcon, 
  EyeIcon,
  BellIcon,
  Cog6ToothIcon,
  MagnifyingGlassIcon,
  ArrowTrendingUpIcon,
  DocumentChartBarIcon,
  CalendarIcon,
  BanknotesIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  SparklesIcon
} from '@heroicons/react/24/outline';

const Terminal = () => {
  const [activeSection, setActiveSection] = useState('overview');
  const [selectedTicker, setSelectedTicker] = useState('AAPL');

  const sidebarSections = [
    { id: 'overview', label: 'Overview', icon: ChartBarIcon },
    { id: 'financials', label: 'Financials', icon: DocumentChartBarIcon },
    { id: 'charts', label: 'Charts', icon: ArrowTrendingUpIcon },
    { id: 'news', label: 'News', icon: NewspaperIcon },
    { id: 'earnings', label: 'Earnings', icon: CalendarIcon },
    { id: 'dividends', label: 'Dividends', icon: BanknotesIcon },
    { id: 'superinvestors', label: 'Super-Investoren', icon: UserGroupIcon },
    { id: 'watchlist', label: 'Watchlist', icon: EyeIcon },
  ];

  const quickStats = [
    { label: 'Market Cap', value: '$2.85T', change: '+2.1%', positive: true },
    { label: 'P/E Ratio', value: '28.4', change: '-0.5%', positive: false },
    { label: 'Revenue (TTM)', value: '$394.3B', change: '+8.2%', positive: true },
    { label: 'Dividend Yield', value: '0.89%', change: '+0.02%', positive: true },
  ];

  const watchlistStocks = [
    { ticker: 'AAPL', name: 'Apple Inc.', price: 185.24, change: 2.1 },
    { ticker: 'MSFT', name: 'Microsoft', price: 378.91, change: -1.2 },
    { ticker: 'GOOGL', name: 'Alphabet', price: 142.56, change: 0.8 },
    { ticker: 'TSLA', name: 'Tesla', price: 248.33, change: 4.5 },
  ];

  const renderContent = () => {
    switch (activeSection) {
      case 'overview':
        return (
          <div className="space-y-6">
            {/* Main Chart Area */}
            <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-white">Apple Inc. (AAPL)</h2>
                  <div className="flex items-center gap-3 mt-2">
                    <span className="text-3xl font-bold text-white">$185.24</span>
                    <span className="flex items-center gap-1 text-green-400 bg-green-500/20 px-3 py-1 rounded-lg">
                      <ArrowUpIcon className="w-4 h-4" />
                      +2.1% (+$3.81)
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-gray-400 text-sm">As of Dec 15, 2024</div>
                  <div className="text-gray-500 text-xs">Market Open</div>
                </div>
              </div>

              {/* Mock Chart */}
              <div className="h-64 bg-gray-800/30 rounded-lg p-4 mb-4">
                <svg className="w-full h-full" viewBox="0 0 400 200">
                  <defs>
                    <linearGradient id="chartGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#10b981" stopOpacity="0.3" />
                      <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  
                  {/* Chart Line */}
                  <path
                    d="M 20 150 L 80 140 L 140 120 L 200 100 L 260 110 L 320 90 L 380 80"
                    fill="none"
                    stroke="#10b981"
                    strokeWidth="3"
                    strokeLinecap="round"
                  />
                  
                  {/* Area under curve */}
                  <path
                    d="M 20 150 L 80 140 L 140 120 L 200 100 L 260 110 L 320 90 L 380 80 L 380 180 L 20 180 Z"
                    fill="url(#chartGradient)"
                  />
                </svg>
              </div>

              {/* Chart Controls */}
              <div className="flex items-center justify-between">
                <div className="flex gap-2">
                  {['1D', '5D', '1M', '3M', '6M', '1Y', '5Y'].map((period) => (
                    <button
                      key={period}
                      className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                        period === '1M' 
                          ? 'bg-green-500 text-black' 
                          : 'text-gray-400 hover:text-white hover:bg-gray-800'
                      }`}
                    >
                      {period}
                    </button>
                  ))}
                </div>
                <div className="text-sm text-gray-500">Volume: 52.3M</div>
              </div>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {quickStats.map((stat, index) => (
                <div key={index} className="bg-gray-900/50 border border-gray-800 rounded-xl p-4">
                  <div className="text-gray-400 text-sm mb-2">{stat.label}</div>
                  <div className="text-white text-xl font-bold mb-1">{stat.value}</div>
                  <div className={`flex items-center gap-1 text-sm ${
                    stat.positive ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {stat.positive ? (
                      <ArrowUpIcon className="w-3 h-3" />
                    ) : (
                      <ArrowDownIcon className="w-3 h-3" />
                    )}
                    {stat.change}
                  </div>
                </div>
              ))}
            </div>

            {/* Two Column Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* News Section */}
              <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <NewspaperIcon className="w-5 h-5" />
                  Latest News
                </h3>
                <div className="space-y-4">
                  {[
                    { title: 'Apple reports record Q4 earnings', time: '2h ago', source: 'Reuters' },
                    { title: 'iPhone 15 sales exceed expectations', time: '4h ago', source: 'Bloomberg' },
                    { title: 'Apple expands into AI services', time: '1d ago', source: 'TechCrunch' },
                  ].map((news, index) => (
                    <div key={index} className="border-b border-gray-800 last:border-b-0 pb-3 last:pb-0">
                      <div className="text-white font-medium text-sm mb-1">{news.title}</div>
                      <div className="text-gray-500 text-xs">{news.source} • {news.time}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Super Investors */}
              <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <UserGroupIcon className="w-5 h-5" />
                  Super-Investor Holdings
                </h3>
                <div className="space-y-4">
                  {[
                    { name: 'Warren Buffett', company: 'Berkshire Hathaway', shares: '915.6M', percentage: '47.8%' },
                    { name: 'Tim Cook', company: 'Apple Inc.', shares: '3.3M', percentage: '0.02%' },
                    { name: 'Vanguard Group', company: 'Vanguard', shares: '1.3B', percentage: '8.2%' },
                  ].map((investor, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div>
                        <div className="text-white font-medium text-sm">{investor.name}</div>
                        <div className="text-gray-500 text-xs">{investor.company}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-white text-sm">{investor.shares}</div>
                        <div className="text-gray-400 text-xs">{investor.percentage}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );
        
      case 'watchlist':
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-white">My Watchlist</h2>
              <button className="px-4 py-2 bg-green-500 hover:bg-green-400 text-black font-medium rounded-lg transition-colors">
                Add Stock
              </button>
            </div>
            
            <div className="bg-gray-900/50 border border-gray-800 rounded-xl overflow-hidden">
              <div className="grid grid-cols-4 gap-4 p-4 bg-gray-800/50 text-sm font-medium text-gray-300">
                <div>Symbol</div>
                <div>Name</div>
                <div className="text-right">Price</div>
                <div className="text-right">Change</div>
              </div>
              
              {watchlistStocks.map((stock, index) => (
                <div key={index} className="grid grid-cols-4 gap-4 p-4 border-b border-gray-800 last:border-b-0 hover:bg-gray-800/30 transition-colors cursor-pointer">
                  <div className="font-medium text-white">{stock.ticker}</div>
                  <div className="text-gray-300">{stock.name}</div>
                  <div className="text-right text-white">${stock.price.toFixed(2)}</div>
                  <div className={`text-right flex items-center justify-end gap-1 ${
                    stock.change >= 0 ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {stock.change >= 0 ? (
                      <ArrowUpIcon className="w-3 h-3" />
                    ) : (
                      <ArrowDownIcon className="w-3 h-3" />
                    )}
                    {stock.change >= 0 ? '+' : ''}{stock.change.toFixed(1)}%
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
        
      default:
        return (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="text-gray-400 mb-2">Coming Soon</div>
              <div className="text-white font-semibold">{sidebarSections.find(s => s.id === activeSection)?.label}</div>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="h-screen bg-gray-950 flex overflow-hidden">
      {/* Sidebar */}
      <div className="w-64 bg-gray-900 border-r border-gray-800 flex flex-col">
        {/* Logo/Header */}
        <div className="p-6 border-b border-gray-800">
          <div className="flex items-center gap-2">
            <div className="flex items-end gap-0.5">
              <div className="w-1.5 h-3 bg-green-500 rounded-sm"></div>
              <div className="w-1.5 h-4 bg-green-500 rounded-sm"></div>
              <div className="w-1.5 h-5 bg-green-500 rounded-sm"></div>
            </div>
            <span className="text-xl font-bold text-white">FinClue</span>
            <span className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded font-medium">
              Terminal
            </span>
          </div>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-gray-800">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
            <input
              type="text"
              placeholder="Search stocks..."
              className="w-full pl-10 pr-4 py-2 text-sm bg-gray-800 border border-gray-700 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:border-green-500"
              value={selectedTicker}
              onChange={(e) => setSelectedTicker(e.target.value)}
            />
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4">
          <div className="space-y-1">
            {sidebarSections.map((section) => {
              const Icon = section.icon;
              const isActive = activeSection === section.id;
              
              return (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    isActive 
                      ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                      : 'text-gray-400 hover:text-white hover:bg-gray-800'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {section.label}
                </button>
              );
            })}
          </div>
        </nav>

        {/* User Profile */}
        <div className="p-4 border-t border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-green-400 to-green-600 rounded-lg flex items-center justify-center text-black font-semibold text-sm">
              A
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-white text-sm font-medium truncate">Alex Müller</div>
              <div className="flex items-center gap-1 text-xs">
                <SparklesIcon className="w-3 h-3 text-yellow-400" />
                <span className="text-green-400">Premium</span>
              </div>
            </div>
            <button className="p-1 text-gray-400 hover:text-white transition-colors">
              <Cog6ToothIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <div className="h-16 bg-gray-900 border-b border-gray-800 flex items-center justify-between px-6">
          <div className="flex items-center gap-4">
            <h1 className="text-lg font-semibold text-white">
              {sidebarSections.find(s => s.id === activeSection)?.label}
            </h1>
            {activeSection === 'overview' && (
              <div className="text-sm text-gray-400">
                Real-time market data
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-3">
            <button className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors">
              <BellIcon className="w-4 h-4" />
            </button>
            <div className="w-px h-6 bg-gray-700"></div>
            <div className="text-sm text-gray-400">
              Last updated: 2 min ago
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-auto p-6">
          {renderContent()}
        </div>
      </div>
    </div>
  );
};

export default Terminal;