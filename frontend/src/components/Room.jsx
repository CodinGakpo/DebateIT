import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Mic,
  MicOff,
  PhoneOff,
  Settings,
  MessageSquare,
  Users,
  Shield,
  Sword,
  Copy,
  Check,
  Send,
  X,
} from "lucide-react";
import useAudioDetection from "../hooks/useAudioDetection";

export default function Room() {
  
  const { roomCode } = useParams();
  const navigate = useNavigate();
  const socketRef = useRef(null);
  const chatEndRef = useRef(null);
  const messageInputRef = useRef(null);

  const [isMuted, setIsMuted] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showExitModal, setShowExitModal] = useState(false);
  const [message, setMessage] = useState("");
  const [opponentSpeaking, setOpponentSpeaking] = useState(false);
  const [chatMessages, setChatMessages] = useState([
    {
      id: 1,
      sender: "System",
      text: "Welcome to the DebateIt!",
      timestamp: new Date(),
      isSystem: true,
    },
  ]);
  const [participants, setParticipants] = useState([]);
  const [selfId, setSelfId] = useState(null);
  const [selfName, setSelfName] = useState("You");

  // Use audio detection hook
  const isSpeaking = useAudioDetection(isMuted, 30);

  useEffect(() => {
  if (!roomCode) return;

  // get current user email (or Anonymous)
  const currentUserEmail =
    localStorage.getItem("debateitUserEmail") || "Anonymous";

  // close any existing socket first (helps with StrictMode double calls)
  if (socketRef.current) {
    try {
      socketRef.current.close();
    } catch (e) {
      console.warn("Error closing existing room socket", e);
    }
    socketRef.current = null;
  }

  // create a new WebSocket
  const socket = new WebSocket(
    `ws://localhost:8000/ws/room/${roomCode}/?email=${encodeURIComponent(
      currentUserEmail
    )}`
  );

  // store it in the ref
  socketRef.current = socket;

  // now attach handlers on the *local* socket variable
  socket.onopen = () => {
    console.log("Room socket connected");
  };

  socket.onmessage = (e) => {
    const data = JSON.parse(e.data);
    console.log("Received message:", data);

    if (data.type === "room_state") {
      setSelfId(data.self.id);
      setParticipants([data.self, ...data.participants]);
    } else if (data.type === "participant_joined") {
      setParticipants((prev) => {
        if (prev.some((p) => p.id === data.participant.id)) return prev;
        return [...prev, data.participant];
      });
    } else if (data.type === "participant_left") {
      setParticipants((prev) =>
        prev.filter((p) => p.id !== data.user_id)
      );
    } else if (data.type === "chat_message") {
      setChatMessages((prev) => [
        ...prev,
        {
          id: Date.now(),
          sender: data.sender, // opponent’s email
          text: data.message,
          timestamp: new Date(),
          isSystem: false,
        },
      ]);
    } else if (data.type === "audio_status") {
      setIsOpponentMuted(data.muted);
    } else if (data.type === "speaking_status") {
      if (data.user_id === "opponent") {
        setIsOpponentSpeaking(data.isSpeaking);
      }
    }
  };

  socket.onclose = () => {
    console.log("Room socket closed");
  };

  socket.onerror = (err) => {
    console.error("Room socket error", err);
  };

  // cleanup on unmount / room change
  return () => {
    try {
      socket.close();
    } catch (e) {
      console.warn("Error closing room socket on cleanup", e);
    }
    socketRef.current = null;
  };
}, [roomCode]);


  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  // Send speaking status to server when it changes
  useEffect(() => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(
        JSON.stringify({
          type: "speaking_status",
          isSpeaking: isSpeaking,
        })
      );
    }
  }, [isSpeaking]);

  function toggleMute() {
    setIsMuted(!isMuted);
    socketRef.current?.send(
      JSON.stringify({
        type: "toggle_audio",
        muted: !isMuted,
      })
    );
  }

  function handleLeaveRoom() {
    setShowExitModal(true);
  }

  function confirmLeave() {
    socketRef.current?.close();
    navigate("/");
  }

  function copyRoomCode() {
    navigator.clipboard.writeText(roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function sendMessage(e) {
    e.preventDefault();
    if (message.trim()) {
      const newMessage = {
        id: Date.now(),
        sender: "You",
        text: message,
        timestamp: new Date(),
        isSystem: false,
      };

      setChatMessages((prev) => [...prev, newMessage]);

      socketRef.current?.send(
        JSON.stringify({
          type: "chat_message",
          message: message,
          // sender: "You"
        })
      );

      setMessage("");
      messageInputRef.current?.focus();
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900">
      {/* Exit Confirmation Modal */}
      {showExitModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center px-4">
          <div className="relative max-w-md w-full">
            <div className="absolute inset-0 bg-gradient-to-r from-red-500 to-rose-500 rounded-2xl blur-xl opacity-50"></div>
            <div className="relative bg-slate-800 border-2 border-red-500 rounded-2xl p-8">
              <div className="text-center mb-6">
                <div className="bg-red-500/20 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <PhoneOff className="w-8 h-8 text-red-400" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">
                  Quit Debate?
                </h3>
                <p className="text-gray-400">
                  Are you sure you want to leave this debate? Your progress will
                  be lost.
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowExitModal(false)}
                  className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-medium py-3 rounded-xl transition-colors"
                >
                  Stay
                </button>
                <button
                  onClick={confirmLeave}
                  className="flex-1 bg-gradient-to-r from-red-500 to-rose-500 hover:from-red-600 hover:to-rose-600 text-white font-medium py-3 rounded-xl transition-colors"
                >
                  Yes, Quit
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-slate-900/95 backdrop-blur-sm border-b border-purple-500/30 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={handleLeaveRoom}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 border-2 border-red-500/30 hover:border-red-500 text-red-400 hover:text-red-300 transition-all"
              title="Quit debate"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="bg-gradient-to-br from-purple-500 to-pink-500 p-2 rounded-lg">
              <Sword className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-white font-bold text-lg">Battle Arena</h1>
              <div className="flex items-center gap-2">
                <p className="text-gray-400 text-sm">Room: {roomCode}</p>
                <button
                  onClick={copyRoomCode}
                  className="text-purple-400 hover:text-purple-300 transition-colors"
                  title="Copy room code"
                >
                  {copied ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-slate-800 rounded-lg px-3 py-2 border border-purple-500/30">
              <Users className="w-4 h-4 text-purple-400" />
              <span className="text-white text-sm font-medium">
                {participants.length}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Chat Sidebar */}
      <div
        className={`fixed top-0 right-0 h-full w-full lg:w-[400px] bg-slate-900 border-l-2 border-purple-500/50 z-40 transform transition-transform duration-300 ease-in-out ${
          showChat ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Chat Header */}
          <div className="bg-slate-800 border-b border-purple-500/30 p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-purple-400" />
              <h3 className="text-white font-bold">Debate Chat</h3>
            </div>
            <button
              onClick={() => setShowChat(false)}
              className="lg:hidden text-gray-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {chatMessages.map((msg) => (
              <div
                key={msg.id}
                className={`${
                  msg.isSystem
                    ? "text-center"
                    : msg.sender === "You"
                    ? "flex justify-end"
                    : "flex justify-start"
                }`}
              >
                {msg.isSystem ? (
                  <div className="bg-purple-500/20 text-purple-300 text-xs px-3 py-1 rounded-full border border-purple-500/30">
                    {msg.text}
                  </div>
                ) : (
                  <div
                    className={`max-w-[75%] ${
                      msg.sender === "You"
                        ? "bg-gradient-to-r from-purple-500 to-pink-500"
                        : "bg-slate-700"
                    } rounded-2xl px-4 py-2`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-bold text-white">
                        {msg.sender}
                      </span>
                      <span className="text-xs text-gray-300">
                        {msg.timestamp.toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                    <p className="text-white text-sm">{msg.text}</p>
                  </div>
                )}
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>

          {/* Chat Input */}
          <form
            onSubmit={sendMessage}
            className="border-t border-purple-500/30 p-4"
          >
            <div className="flex gap-2">
              <input
                ref={messageInputRef}
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Type your message..."
                className="flex-1 bg-slate-700 border border-purple-500/30 rounded-xl px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-purple-500 transition-colors"
              />
              <button
                type="submit"
                disabled={!message.trim()}
                className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed text-white p-3 rounded-xl transition-all"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Chat Overlay for Mobile */}
      {showChat && (
        <div
          className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-30"
          onClick={() => setShowChat(false)}
        ></div>
      )}

      {/* Main Content Area */}
      <div
        className={`max-w-7xl mx-auto px-6 py-8 transition-all duration-300 ${
          showChat ? "lg:pr-[450px]" : ""
        }`}
      >
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
    {/* Participant Video Feeds */}
    {participants.map((participant) => {
  const isSelf = participant.id === selfId;
  const displayName = isSelf ? "You" : (participant.name || "Anonymous");
  const role = participant.role || "Defender"; // default fallback

  const isChallenger = role === "Challenger";
  const borderColor = isChallenger ? "border-red-500" : "border-blue-500";
  const glowColor = isChallenger ? "shadow-red-500/50" : "shadow-blue-500/50";
  const iconBg = isChallenger
    ? "bg-gradient-to-br from-red-500 to-rose-500"
    : "bg-gradient-to-br from-blue-500 to-cyan-500";

  return (
    <div
      key={participant.id}
      className="relative group rounded-3xl bg-slate-900/80 border border-slate-700/80 overflow-hidden shadow-2xl shadow-black/60"
    >
      <div
        className={`relative overflow-hidden rounded-3xl border-2 ${borderColor} shadow-lg ${glowColor}`}
        style={{ aspectRatio: "16/9" }}
      >
        {/* Video Placeholder */}
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-slate-800 to-slate-900">
          <div className={`w-24 h-24 rounded-full flex items-center justify-center ${iconBg}`}>
            {isChallenger ? (
              <Sword className="w-12 h-12 text-white" />
            ) : (
              <Shield className="w-12 h-12 text-white" />
            )}
          </div>
        </div>

        {/* Name + Role Overlay */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white font-bold">{displayName}</p>
              <span
                className={`text-xs px-2 py-0.5 rounded ${
                  isChallenger
                    ? "bg-red-500/20 text-red-400 border border-red-500/30"
                    : "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                }`}
              >
                {role}
              </span>
            </div>
            {isMuted && isSelf && (
              <div className="bg-red-500/20 p-2 rounded-lg border border-red-500/50">
                <MicOff className="w-4 h-4 text-red-400" />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
})}

  </div>


        {/* Debate Info Panel */}
        <div className="relative group mb-8">
          <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl blur-xl opacity-20"></div>
          <div className="relative bg-slate-800/50 backdrop-blur-sm border border-purple-500/30 rounded-xl p-6">
            <div className="flex items-start gap-4">
              <MessageSquare className="w-6 h-6 text-purple-400 flex-shrink-0 mt-1" />
              <div className="flex-1">
                <h3 className="text-white font-bold mb-2">Debate Topic</h3>
                <p className="text-gray-300 leading-relaxed">
                  The debate topic will appear here once both participants have
                  joined the room. Prepare your arguments and may the best
                  debater win!
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Control Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-slate-900/95 backdrop-blur-sm border-t border-purple-500/30 px-6 py-6">
        <div className="max-w-4xl mx-auto flex items-center justify-center gap-4">
          {/* Mute Button */}
          <button
            onClick={toggleMute}
            className={`p-4 rounded-full transition-all ${
              isMuted
                ? "bg-red-500 hover:bg-red-600 text-white"
                : "bg-slate-700 hover:bg-slate-600 text-white"
            } shadow-lg`}
            title={isMuted ? "Unmute" : "Mute"}
          >
            {isMuted ? (
              <MicOff className="w-6 h-6" />
            ) : (
              <Mic className="w-6 h-6" />
            )}
          </button>

          {/* Settings Button */}
          <button
            className="p-4 rounded-full bg-slate-700 hover:bg-slate-600 text-white transition-all shadow-lg"
            title="Settings"
          >
            <Settings className="w-6 h-6" />
          </button>

          {/* Chat Toggle Button */}
          <button
            onClick={() => setShowChat(!showChat)}
            className={`p-4 rounded-full transition-all shadow-lg ${
              showChat
                ? "bg-purple-500 hover:bg-purple-600 text-white"
                : "bg-slate-700 hover:bg-slate-600 text-white"
            }`}
            title="Toggle chat"
          >
            <MessageSquare className="w-6 h-6" />
          </button>

          {/* Leave Button */}
          <button
            onClick={handleLeaveRoom}
            className="p-4 rounded-full bg-red-500 hover:bg-red-600 text-white transition-all shadow-lg ml-4"
            title="Leave room"
          >
            <PhoneOff className="w-6 h-6" />
          </button>
        </div>

        {/* Control Labels */}
        <div className="max-w-4xl mx-auto flex items-center justify-center gap-4 mt-3">
          <span className="text-xs text-gray-400 w-14 text-center">
            {isMuted ? "Unmute" : "Mute"}
          </span>
          <span className="text-xs text-gray-400 w-14 text-center">
            Settings
          </span>
          <span className="text-xs text-gray-400 w-14 text-center">Chat</span>
          <span className="text-xs text-gray-400 w-14 text-center ml-4">
            Leave
          </span>
        </div>
      </div>
    </div>
  );
}
