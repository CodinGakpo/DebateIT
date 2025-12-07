// frontend/src/components/SettingsModal.jsx
import { useState } from "react";
import { X, Mic, Volume2 } from "lucide-react";

export default function SettingsModal({
  isOpen,
  onClose,
  isMuted,
  isSpeaking,
  roomCode,
}) {
  if (!isOpen) return null;

  const [activeTab, setActiveTab] = useState("audio");
  const [joinMuted, setJoinMuted] = useState(true);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
      <div className="relative w-full max-w-xl">
        {/* Glow */}
        <div className="absolute inset-0 bg-gradient-to-r from-slate-500/40 via-purple-500/40 to-slate-500/40 rounded-3xl blur-xl opacity-70" />

        {/* Card */}
        <div className="relative bg-slate-900 border border-slate-700 rounded-3xl p-6 shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-white font-semibold text-lg">Settings</h2>
              <p className="text-xs text-gray-400">
                Adjust your preferences for this debate.
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-full bg-slate-800 hover:bg-slate-700 text-gray-300 hover:text-white transition-colors"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mb-4 text-sm">
            {["audio", "video", "general"].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-3 py-1.5 rounded-full capitalize transition-all ${
                  activeTab === tab
                    ? "bg-purple-600 text-white shadow-md"
                    : "bg-slate-800 text-gray-300 hover:bg-slate-700"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Body */}
          {activeTab === "audio" && (
            <div className="space-y-5">
              {/* Mic status row */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-slate-800">
                    <Mic className="w-4 h-4 text-purple-300" />
                  </div>
                  <div>
                    <p className="text-sm text-white font-medium">
                      Microphone
                    </p>
                    <p className="text-xs text-gray-400">
                      Uses your browser&apos;s default input device.
                    </p>
                  </div>
                </div>
                <span
                  className={`text-xs px-2 py-1 rounded-full border ${
                    isMuted
                      ? "bg-red-500/10 text-red-300 border-red-500/40"
                      : "bg-emerald-500/10 text-emerald-300 border-emerald-500/40"
                  }`}
                >
                  {isMuted ? "Muted in call" : "Live in call"}
                </span>
              </div>

              {/* Input level (GMeet-style bar) */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2 text-xs text-gray-300">
                    <Volume2 className="w-3 h-3" />
                    <span>Input level</span>
                  </div>
                  <span className="text-[11px] text-gray-400">
                    {isSpeaking ? "Detecting voice…" : "Waiting for audio…"}
                  </span>
                </div>
                <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className={`h-full transition-all ${
                      isSpeaking ? "w-4/5" : "w-1/5"
                    } bg-emerald-500`}
                  />
                </div>
              </div>

              {/* Join muted toggle (local only, no backend) */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                <div>
                  <p className="text-sm text-white font-medium">
                    Mute when joining a debate
                  </p>
                  <p className="text-xs text-gray-400">
                    Recommended to avoid background noise when you enter.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setJoinMuted((v) => !v)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    joinMuted ? "bg-purple-600" : "bg-slate-600"
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      joinMuted ? "translate-x-5" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>
            </div>
          )}

          {activeTab === "video" && (
            <div className="space-y-3 text-sm text-gray-300">
              <p className="text-xs text-gray-400">
                Video controls will be available when camera support is added.
              </p>
              <div className="rounded-2xl border border-dashed border-slate-700 p-4 text-center text-xs text-gray-500">
                Coming soon: camera selection and preview, just like Meet.
              </div>
            </div>
          )}

          {activeTab === "general" && (
            <div className="space-y-4 text-sm text-gray-300">
              <div>
                <p className="text-xs text-gray-400 mb-1">Room code</p>
                <div className="flex items-center justify-between bg-slate-800 rounded-xl px-3 py-2 text-xs">
                  <span className="text-gray-200 truncate">{roomCode}</span>
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-xs text-gray-400">Theme</p>
                <div className="flex gap-2">
                  <button className="px-3 py-1.5 rounded-full bg-purple-600 text-xs text-white">
                    Classic
                  </button>
                  <button className="px-3 py-1.5 rounded-full bg-slate-800 text-xs text-gray-300">
                    High contrast
                  </button>
                </div>
                <p className="text-[11px] text-gray-500">
                  Visual only for now – doesn&apos;t change the layout yet.
                </p>
              </div>
            </div>
          )}

          {/* Footer actions */}
          <div className="mt-6 flex justify-end gap-2 text-sm">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-gray-200 transition-colors"
            >
              Close
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-medium transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
