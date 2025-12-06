import React, { useState, useEffect } from 'react';
import { Menu, X, Swords, User, LogOut, Trophy, Medal, Flame } from 'lucide-react';
import { useKindeAuth } from "@kinde-oss/kinde-auth-react";

export default function Navbar({ onProfileToggle, isProfileOpen }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { login, logout, user, isLoading, isAuthenticated } = useKindeAuth();

    useEffect(() => {
    if (isAuthenticated && user?.email) {
      // Save the logged-in user's email for the Room page
      localStorage.setItem("debateitUserEmail", user.email);
    }
  }, [isAuthenticated, user]);

  if (isLoading) {
    return (
      <nav className="fixed top-0 left-0 right-0 z-50 bg-slate-900/95 backdrop-blur-sm border-b border-purple-500/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center h-16">
            <div className="text-gray-400">Loading...</div>
          </div>
        </div>
      </nav>
    );
  }

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-50 bg-slate-900/95 backdrop-blur-sm border-b border-purple-500/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center space-x-2">
              <div className="bg-gradient-to-br from-purple-500 to-pink-500 p-2 rounded-lg">
                <Swords className="w-6 h-6 text-white" />
              </div>
              <span className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                DebateIt
              </span>
            </div>

            {/* Desktop Navigation */}
            {isAuthenticated && (
              <div className="hidden md:flex items-center space-x-8">
                <a href="#arena" className="text-gray-300 hover:text-purple-400 transition-colors">
                  Arena
                </a>
                <a href="#leaderboard" className="text-gray-300 hover:text-purple-400 transition-colors">
                  Leaderboard
                </a>
                <a href="#about" className="text-gray-300 hover:text-purple-400 transition-colors">
                  About
                </a>
              </div>
            )}

            {/* User Section */}
            <div className="flex items-center space-x-4">
              {isAuthenticated ? (
                <>
                  <div className="hidden md:flex items-center space-x-3">
                    <span className="text-gray-400 text-sm">Hello,</span>
                    <span className="text-white font-medium">{user?.given_name || user?.email}</span>
                  </div>
                  <button
                    onClick={onProfileToggle}
                    className={`p-2 rounded-lg transition-all ${
                      isProfileOpen 
                        ? 'bg-purple-600 text-white' 
                        : 'bg-purple-600/20 text-purple-400 hover:bg-purple-600 hover:text-white'
                    }`}
                  >
                    <User className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => {
    localStorage.removeItem("debateitUserEmail");
    logout();
  }}
                    className="hidden md:block p-2 text-gray-400 hover:text-red-400 transition-colors"
                    title="Logout"
                  >
                    <LogOut className="w-5 h-5" />
                  </button>
                </>
              ) : (
                <button
                  onClick={login}
                  className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-6 py-2 rounded-lg font-medium transition-all shadow-lg shadow-purple-500/50"
                >
                  Login
                </button>
              )}

              {/* Mobile menu button */}
              {isAuthenticated && (
                <button
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                  className="md:hidden text-gray-300 hover:text-purple-400"
                >
                  {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        {isAuthenticated && isMenuOpen && (
          <div className="md:hidden bg-slate-800/95 backdrop-blur-sm border-t border-purple-500/30">
            <div className="px-4 py-4 space-y-3">
              <div className="flex items-center space-x-3 pb-3 border-b border-purple-500/30">
                <User className="w-5 h-5 text-purple-400" />
                <span className="text-white font-medium">{user?.given_name || user?.email}</span>
              </div>
              <a href="#arena" className="block text-gray-300 hover:text-purple-400 transition-colors py-2">
                Arena
              </a>
              <a href="#leaderboard" className="block text-gray-300 hover:text-purple-400 transition-colors py-2">
                Leaderboard
              </a>
              <a href="#about" className="block text-gray-300 hover:text-purple-400 transition-colors py-2">
                About
              </a>
              <button
                onClick={() => {
    localStorage.removeItem("debateitUserEmail");
    logout();
  }}
                className="w-full text-left text-red-400 hover:text-red-300 transition-colors py-2"
              >
                Logout
              </button>
            </div>
          </div>
        )}
      </nav>

      {/* Profile Sidebar */}
      {isAuthenticated && (
        <div
          className={`fixed top-16 right-0 h-[calc(100vh-4rem)] bg-slate-900/98 backdrop-blur-sm border-l border-purple-500/30 z-40 transform transition-transform duration-300 ease-in-out overflow-y-auto ${
            isProfileOpen ? 'translate-x-0' : 'translate-x-full'
          } w-full md:w-96`}
        >
          <div className="p-6">
            {/* Profile Header */}
            <div className="text-center mb-8">
              <div className="w-24 h-24 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full mx-auto mb-4 flex items-center justify-center">
                <User className="w-12 h-12 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-1">
                {user?.given_name || 'Gladiator'}
              </h2>
              <p className="text-gray-400 text-sm">@{user?.email?.split('@')[0] || 'debater'}</p>
            </div>

            {/* League Info */}
            <div className="bg-gradient-to-br from-purple-900/50 to-slate-800 rounded-xl p-6 border border-purple-500/30 mb-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-white font-bold">Current League</h3>
                <Trophy className="w-5 h-5 text-yellow-400" />
              </div>
              <div className="flex items-center space-x-3 mb-3">
                <div className="bg-gradient-to-br from-purple-500 to-pink-500 p-2 rounded-lg">
                  <Medal className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-white font-bold">Diamond League</p>
                  <p className="text-gray-400 text-sm">Rank #847</p>
                </div>
              </div>
              <div className="mb-2">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-400">Progress to Master</span>
                  <span className="text-purple-400 font-medium">67%</span>
                </div>
                <div className="w-full bg-slate-700 rounded-full h-2">
                  <div className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full" style={{ width: '67%' }}></div>
                </div>
              </div>
            </div>

            {/* Battle Stats */}
            <div className="mb-6">
              <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                <Swords className="w-5 h-5 text-purple-400" />
                Battle Stats
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-800/50 border border-yellow-500/30 rounded-lg p-4 text-center">
                  <Trophy className="w-6 h-6 text-yellow-400 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-white">24</p>
                  <p className="text-gray-400 text-sm">Trophies</p>
                </div>
                <div className="bg-slate-800/50 border border-green-500/30 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-white mb-1">64%</div>
                  <p className="text-gray-400 text-sm">Win Rate</p>
                </div>
                <div className="bg-slate-800/50 border border-blue-500/30 rounded-lg p-4 text-center">
                  <Medal className="w-6 h-6 text-blue-400 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-white">156</p>
                  <p className="text-gray-400 text-sm">Total Battles</p>
                </div>
                <div className="bg-slate-800/50 border border-orange-500/30 rounded-lg p-4 text-center">
                  <Flame className="w-6 h-6 text-orange-400 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-white">8</p>
                  <p className="text-gray-400 text-sm">Win Streak</p>
                </div>
              </div>
            </div>

            {/* Arena Performance */}
            <div className="bg-slate-800/50 border border-purple-500/30 rounded-lg p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-white font-bold">Arena Performance</h3>
                <span className="bg-yellow-500/20 text-yellow-400 text-xs font-bold px-2 py-1 rounded">
                  SEASON III
                </span>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Victories</span>
                  <span className="text-white font-bold">18</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Defeats</span>
                  <span className="text-white font-bold">7</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Current Streak</span>
                  <span className="text-orange-400 font-bold">8 Wins</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Overlay */}
      {isAuthenticated && isProfileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 top-16"
          onClick={onProfileToggle}
        ></div>
      )}
    </>
  );
}