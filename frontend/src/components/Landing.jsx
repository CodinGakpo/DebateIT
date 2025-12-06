// src/components/Landing.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useKindeAuth } from "@kinde-oss/kinde-auth-react";
import Navbar from "./Navbar";
import {
  Skull,
  Swords,
  Users,
  Trophy,
  Target,
  Zap,
  Globe,
  Award,
  Lock,
  X
} from "lucide-react";

export default function Landing() {
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const navigate = useNavigate();
  const { isAuthenticated, login } = useKindeAuth();

  const handleProfileToggle = () => setIsProfileOpen((prev) => !prev);

  // Check authentication before allowing access
  function checkAuthAndNavigate(callback) {
    if (!isAuthenticated) {
      setShowLoginModal(true);
      return;
    }
    callback();
  }

  // Stranger Danger → random room
  function handleStrangerDanger() {
    checkAuthAndNavigate(() => {
      const code = Math.random().toString(36).substring(2, 8).toUpperCase();
      navigate(`/room/${code}`);
    });
  }

  // Friendly Fire → create/join screen
  function handleFriendlyFire() {
    checkAuthAndNavigate(() => {
      navigate("/create-join");
    });
  }

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Navbar only on this page */}
      <Navbar
        onProfileToggle={handleProfileToggle}
        isProfileOpen={isProfileOpen}
      />

      {/* Login Required Modal */}
      {showLoginModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center px-4">
          <div className="relative max-w-md w-full">
            <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl blur-xl opacity-50"></div>
            <div className="relative bg-slate-800 border-2 border-purple-500 rounded-2xl p-8">
              <button
                onClick={() => setShowLoginModal(false)}
                className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
              
              <div className="text-center mb-6">
                <div className="bg-purple-500/20 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Lock className="w-8 h-8 text-purple-400" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">Login Required</h3>
                <p className="text-gray-400">You need to be logged in to enter the battle arena</p>
              </div>
              
              <button
                onClick={() => {
                  setShowLoginModal(false);
                  login();
                }}
                className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-bold py-3 rounded-xl transition-colors"
              >
                Login to Continue
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Page content */}
      <div
        className={`bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 transition-all duration-300 ${
          isProfileOpen ? "md:mr-96" : ""
        }`}
      >
        <div className="pt-32 pb-20 px-4">
          <div className="max-w-6xl mx-auto">
            {/* Arena Modes */}
            <div
              className={`grid gap-6 mb-20 transition-all duration-300 ${
                isProfileOpen
                  ? "md:grid-cols-1 lg:grid-cols-2"
                  : "md:grid-cols-2"
              }`}
            >
              {/* Stranger Danger */}
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-r from-red-500 to-rose-500 rounded-2xl blur-xl opacity-50 group-hover:opacity-75 transition-opacity"></div>
                <div className="relative bg-slate-800/90 backdrop-blur-sm border-2 border-red-500 rounded-2xl p-8 hover:border-red-400 transition-all">
                  <div className="flex items-start justify-between mb-4">
                    <div className="bg-red-500 p-3 rounded-xl">
                      <Skull className="w-8 h-8 text-white" />
                    </div>
                    <span className="bg-red-500/20 text-red-400 text-xs font-bold px-3 py-1 rounded-full border border-red-500/50">
                      ARENA MODE
                    </span>
                  </div>

                  <h2 className="text-3xl font-bold text-white mb-2">
                    Stranger Danger
                  </h2>
                  <p className="text-gray-400 mb-6">
                    Battle wits with random opponents worldwide
                  </p>

                  <div className="flex flex-wrap gap-2 mb-6">
                    <span className="bg-slate-700/50 text-red-400 text-sm px-3 py-1 rounded-lg border border-red-500/30 flex items-center gap-2">
                      <Swords className="w-3 h-3" />
                      Combat Ready
                    </span>
                    <span className="bg-slate-700/50 text-yellow-400 text-sm px-3 py-1 rounded-lg border border-yellow-500/30 flex items-center gap-2">
                      <Trophy className="w-3 h-3" />
                      Ranked
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={handleStrangerDanger}
                    className="w-full bg-red-500 hover:bg-red-600 text-white font-bold py-4 rounded-xl transition-colors shadow-lg shadow-red-500/50 flex items-center justify-center gap-2"
                  >
                    {!isAuthenticated && <Lock className="w-5 h-5" />}
                    ENTER BATTLE
                  </button>
                </div>
              </div>

              {/* Friendly Fire */}
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-2xl blur-xl opacity-50 group-hover:opacity-75 transition-opacity"></div>
                <div className="relative bg-slate-800/90 backdrop-blur-sm border-2 border-blue-500 rounded-2xl p-8 hover:border-blue-400 transition-all">
                  <div className="flex items-start justify-between mb-4">
                    <div className="bg-blue-500 p-3 rounded-xl">
                      <Swords className="w-8 h-8 text-white" />
                    </div>
                    <span className="bg-blue-500/20 text-blue-400 text-xs font-bold px-3 py-1 rounded-full border border-blue-500/50">
                      ARENA MODE
                    </span>
                  </div>

                  <h2 className="text-3xl font-bold text-white mb-2">
                    Friendly Fire
                  </h2>
                  <p className="text-gray-400 mb-6">
                    Challenge your friends to epic debates
                  </p>

                  <div className="flex flex-wrap gap-2 mb-6">
                    <span className="bg-slate-700/50 text-blue-400 text-sm px-3 py-1 rounded-lg border border-blue-500/30 flex items-center gap-2">
                      <Swords className="w-3 h-3" />
                      Combat Ready
                    </span>
                    <span className="bg-slate-700/50 text-yellow-400 text-sm px-3 py-1 rounded-lg border border-yellow-500/30 flex items-center gap-2">
                      <Trophy className="w-3 h-3" />
                      Ranked
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={handleFriendlyFire}
                    className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-4 rounded-xl transition-colors shadow-lg shadow-blue-500/50 flex items-center justify-center gap-2"
                  >
                    {!isAuthenticated && <Lock className="w-5 h-5" />}
                    ENTER BATTLE
                  </button>
                </div>
              </div>
            </div>

            {/* About Section */}
            <div className="relative group mb-20">
              <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl blur-xl opacity-30"></div>
              <div className="relative bg-slate-800/90 backdrop-blur-sm border-2 border-purple-500 rounded-2xl p-10">
                <h2 className="text-3xl font-bold text-white mb-6 text-center">
                  About the Arena
                </h2>
                <p className="text-gray-300 text-center text-lg mb-12 max-w-3xl mx-auto leading-relaxed">
                  DebateArena is the ultimate gamified platform for sharpening
                  your argumentative skills. Engage in real-time debates, climb
                  the ranks, and prove you're the master of words. Whether
                  you're battling strangers or challenging friends, every debate
                  is a chance to level up and earn exclusive rewards.
                </p>

                <div
                  className={`grid gap-6 transition-all duration-300 ${
                    isProfileOpen
                      ? "md:grid-cols-2 lg:grid-cols-4"
                      : "md:grid-cols-2 lg:grid-cols-4"
                  }`}
                >
                  {/* Feature Cards */}
                  <div className="bg-gradient-to-br from-purple-900/50 to-slate-800 p-6 rounded-xl border border-purple-500/30">
                    <div className="bg-purple-500 p-3 rounded-lg w-fit mb-4">
                      <Target className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="text-white font-bold mb-2">Our Mission</h3>
                    <p className="text-gray-400 text-sm">
                      Transform debate into an engaging, competitive experience
                      that builds critical thinking
                    </p>
                  </div>

                  <div className="bg-gradient-to-br from-blue-900/50 to-slate-800 p-6 rounded-xl border border-blue-500/30">
                    <div className="bg-blue-500 p-3 rounded-lg w-fit mb-4">
                      <Zap className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="text-white font-bold mb-2">
                      Real-Time Action
                    </h3>
                    <p className="text-gray-400 text-sm">
                      Instant matchmaking, live scoring, and dynamic
                      leaderboards keep you on your toes
                    </p>
                  </div>

                  <div className="bg-gradient-to-br from-green-900/50 to-slate-800 p-6 rounded-xl border border-green-500/30">
                    <div className="bg-green-500 p-3 rounded-lg w-fit mb-4">
                      <Globe className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="text-white font-bold mb-2">
                      Global Community
                    </h3>
                    <p className="text-gray-400 text-sm">
                      Connect with debaters worldwide and exchange perspectives
                      on diverse topics
                    </p>
                  </div>

                  <div className="bg-gradient-to-br from-yellow-900/50 to-slate-800 p-6 rounded-xl border border-yellow-500/30">
                    <div className="bg-yellow-500 p-3 rounded-lg w-fit mb-4">
                      <Award className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="text-white font-bold mb-2">
                      Earn & Compete
                    </h3>
                    <p className="text-gray-400 text-sm">
                      Unlock achievements, climb leagues, and showcase your
                      debating prowess
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* What Makes Us Different */}
            <div className="relative group mb-20">
              <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl blur-xl opacity-30"></div>
              <div className="relative bg-slate-800/90 backdrop-blur-sm border-2 border-purple-500 rounded-2xl p-10">
                <div className="flex items-center gap-3 mb-8">
                  <Swords className="w-8 h-8 text-purple-400" />
                  <h2 className="text-3xl font-bold text-white">
                    What Makes Us Different
                  </h2>
                </div>

                <div className="space-y-4">
                  <div className="flex items-start gap-4 bg-slate-700/30 p-5 rounded-xl border border-purple-500/20">
                    <div className="w-2 h-2 rounded-full bg-purple-400 mt-2 flex-shrink-0"></div>
                    <p className="text-gray-300">
                      Gamified progression system with leagues, ranks, and
                      seasonal rewards
                    </p>
                  </div>
                  <div className="flex items-start gap-4 bg-slate-700/30 p-5 rounded-xl border border-purple-500/20">
                    <div className="w-2 h-2 rounded-full bg-purple-400 mt-2 flex-shrink-0"></div>
                    <p className="text-gray-300">
                      AI-powered topic suggestions and argument quality scoring
                    </p>
                  </div>
                  <div className="flex items-start gap-4 bg-slate-700/30 p-5 rounded-xl border border-purple-500/20">
                    <div className="w-2 h-2 rounded-full bg-purple-400 mt-2 flex-shrink-0"></div>
                    <p className="text-gray-300">
                      Multiple game modes for casual fun or serious competition
                    </p>
                  </div>
                  <div className="flex items-start gap-4 bg-slate-700/30 p-5 rounded-xl border border-purple-500/20">
                    <div className="w-2 h-2 rounded-full bg-purple-400 mt-2 flex-shrink-0"></div>
                    <p className="text-gray-300">
                      Safe, moderated environment encouraging respectful
                      discourse
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Stats Banner */}
            <div
              className={`grid gap-6 text-center transition-all duration-300 ${
                isProfileOpen ? "grid-cols-1 md:grid-cols-3" : "grid-cols-3"
              }`}
            >
              <div className="bg-slate-800/50 backdrop-blur-sm border border-purple-500/30 rounded-xl p-6">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Users className="w-5 h-5 text-orange-400" />
                  <p className="text-3xl font-bold text-white">1.2K</p>
                </div>
                <p className="text-gray-400 text-sm">Warriors Online</p>
              </div>

              <div className="bg-slate-800/50 backdrop-blur-sm border border-purple-500/30 rounded-xl p-6">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Zap className="w-5 h-5 text-yellow-400" />
                  <p className="text-3xl font-bold text-white">500+</p>
                </div>
                <p className="text-gray-400 text-sm">Battle Topics</p>
              </div>

              <div className="bg-slate-800/50 backdrop-blur-sm border border-purple-500/30 rounded-xl p-6">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Globe className="w-5 h-5 text-blue-400" />
                  <p className="text-3xl font-bold text-white">Global</p>
                </div>
                <p className="text-gray-400 text-sm">Colosseum</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}