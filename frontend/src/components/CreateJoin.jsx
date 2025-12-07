import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useKindeAuth } from "@kinde-oss/kinde-auth-react";
import { Swords, Users, Plus, ArrowRight, Sparkles, Home } from "lucide-react";

export default function CreateJoin() {
  const [roomCode, setRoomCode] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showExitModal, setShowExitModal] = useState(false);
  const { user, getToken } = useKindeAuth();
  const navigate = useNavigate();
  const API_BASE =
    import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api";

  async function createRoom() {
    setError("");
    if (!user?.email) {
      setError("Login required before creating a room.");
      return;
    }

    setIsSubmitting(true);
    try {
      const token = await getToken();
      const res = await fetch(`${API_BASE}/rooms/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ email: user.email }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || "Unable to create room");
      }

      localStorage.setItem("debateitUserEmail", user.email);
      navigate(`/room/${data.roomCode}`);
    } catch (err) {
      setError(err.message || "Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function joinRoom() {
    setError("");
    if (!roomCode.trim()) return;
    if (!user?.email) {
      setError("Login required before joining a room.");
      return;
    }

    setIsSubmitting(true);
    try {
      const token = await getToken();
      const res = await fetch(
        `${API_BASE}/rooms/${roomCode.trim().toUpperCase()}/join/`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ email: user.email }),
        }
      );

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || "Unable to join room");
      }

      localStorage.setItem("debateitUserEmail", user.email);
      navigate(`/room/${data.roomCode}`);
    } catch (err) {
      setError(err.message || "Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleKeyPress(e) {
    if (e.key === "Enter" && roomCode.trim()) {
      joinRoom();
    }
  }

  function handleGoHome() {
    setShowExitModal(true);
  }

  function confirmExit() {
    navigate("/");
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center px-4">
      {/* Home Button */}
      <button
        onClick={handleGoHome}
        className="fixed top-6 left-6 z-50 p-3 rounded-full bg-slate-800 hover:bg-slate-700 border-2 border-purple-500/30 hover:border-purple-500 text-purple-400 hover:text-purple-300 transition-all shadow-lg cursor-pointer"
        title="Go to home"
      >
        <Home className="w-5 h-5" />
      </button>

      {/* Exit Confirmation Modal */}
      {showExitModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center px-4">
          <div className="relative max-w-md w-full">
            <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl blur-xl opacity-50"></div>
            <div className="relative bg-slate-800 border-2 border-purple-500 rounded-2xl p-8">
              <div className="text-center mb-6">
                <div className="bg-purple-500/20 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Home className="w-8 h-8 text-purple-400" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">
                  Return to Home?
                </h3>
                <p className="text-gray-400">
                  Are you sure you want to go back to the landing page?
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowExitModal(false)}
                  className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-medium py-3 rounded-xl transition-colors cursor-pointerx"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmExit}
                  className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-medium py-3 rounded-xl transition-colors cursor-pointer"
                >
                  Yes, Go Home
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-4xl w-full">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="bg-gradient-to-br from-purple-500 to-pink-500 p-3 rounded-xl">
              <Swords className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-5xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              DebateIt
            </h1>
          </div>
          <p className="text-gray-400 text-lg">Choose your path to glory</p>
        </div>

        {/* Main Cards */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* Create Room Card */}

          <div className="relative group h-full">
            <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl blur-xl opacity-50 group-hover:opacity-75 transition-opacity"></div>
            <div className="relative bg-slate-800/90 backdrop-blur-sm border-2 border-purple-500 rounded-2xl p-8 hover:border-purple-400 transition-all flex flex-col h-full">
              <div className="flex-1 flex flex-col items-center">
                <div className="bg-gradient-to-br from-purple-500 to-pink-500 p-4 rounded-xl w-fit mb-6 mx-auto">
                  <Plus className="w-10 h-10 text-white" />
                </div>

                <h2 className="text-2xl font-bold text-white mb-3 text-center">
                  Create Battle Room
                </h2>
                <p className="text-gray-400 text-center mb-6">
                  Start a new debate arena and invite your opponents
                </p>
              </div>

              <button
                onClick={createRoom}
                disabled={isSubmitting}
                className="mt-2 w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-purple-500/50 flex items-center justify-center gap-2 group cursor-pointer"
              >
                <Sparkles className="w-5 h-5" />
                {isSubmitting ? "Working..." : "Create New Room"}
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>

          {/* Join Room Card */}
          <div className="relative group h-full">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-2xl blur-xl opacity-50 group-hover:opacity-75 transition-opacity"></div>
            <div className="relative bg-slate-800/90 backdrop-blur-sm border-2 border-blue-500 rounded-2xl p-8 hover:border-blue-400 transition-all flex flex-col h-full">
              <div className="flex-1 flex flex-col">
                <div className="bg-gradient-to-br from-blue-500 to-cyan-500 p-4 rounded-xl w-fit mb-6 mx-auto">
                  <Users className="w-10 h-10 text-white" />
                </div>

                <h2 className="text-2xl font-bold text-white mb-3 text-center">
                  Join Battle Room
                </h2>
                <p className="text-gray-400 text-center mb-6">
                  Enter a room code to join an ongoing debate
                </p>

                <div className="space-y-4">
                  <input
                    type="text"
                    placeholder="ENTER ROOM CODE"
                    value={roomCode}
                    onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                    onKeyPress={handleKeyPress}
                    className="w-full bg-slate-700/50 border-2 border-blue-500/30 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors text-center text-lg font-bold tracking-wider"
                    maxLength={6}
                  />

                  <button
                    onClick={joinRoom}
                    disabled={!roomCode.trim() || isSubmitting}
                    className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-blue-500/50 flex items-center justify-center gap-2 group cursor-pointer"
                  >
                    {isSubmitting ? "Working..." : "Join Battle"}
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>
              </div>

              {error && (
                <p className="text-sm text-red-400 text-center mt-3">{error}</p>
              )}
            </div>
          </div>
        </div>

        {/* Info Section */}
        <div className="relative group">
          <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl blur-xl opacity-20"></div>
          <div className="relative bg-slate-800/50 backdrop-blur-sm border border-purple-500/30 rounded-xl p-6">
            <div className="flex items-start gap-4">
              <Swords className="w-6 h-6 text-purple-400 flex-shrink-0 mt-1" />
              <div>
                <h3 className="text-white font-bold mb-2">How it works</h3>
                <p className="text-gray-400 text-sm leading-relaxed">
                  Create a room to generate a unique code, or enter an existing
                  code to join a debate. Share the room code with your opponent
                  to begin your battle of words. May the best argument win!
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
