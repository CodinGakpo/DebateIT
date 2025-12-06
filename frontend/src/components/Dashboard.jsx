import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

export default function Dashboard() {
  const navigate = useNavigate();

  // Matchmaking state
  const [status, setStatus] = useState(""); // "", "searching", "waiting", "matched", "error", "cancelled"
  const socketRef = useRef(null);

  // Ensure socket is closed on unmount
  useEffect(() => {
    return () => {
      if (socketRef.current) {
        try { socketRef.current.close(); } catch (e) {}
        socketRef.current = null;
      }
    };
  }, []);

  const startPlay = () => {
    // If already searching, ignore
    if (status === "searching" || status === "waiting") return;

    // Cleanup any old socket
    if (socketRef.current) {
      try { socketRef.current.close(); } catch (e) {}
      socketRef.current = null;
    }

    setStatus("searching");

    const socket = new WebSocket("ws://localhost:8000/ws/matchmaking/");
    socketRef.current = socket;

    socket.onopen = () => {
      // send find_match request
      try {
        socket.send(JSON.stringify({ action: "find_match" }));
        setStatus("waiting"); // now waiting for opponent
      } catch (err) {
        console.error("Failed to send find_match:", err);
        setStatus("error");
      }
    };

    socket.onmessage = (evt) => {
      let data;
      try {
        data = JSON.parse(evt.data);
      } catch (err) {
        console.error("Invalid message from matchmaking socket:", evt.data);
        return;
      }

      // Expecting: { status: "waiting" } or { status: "matched", room_code: "ABC123" }
      if (data.status === "waiting") {
        setStatus("waiting");
        return;
      }

      if (data.status === "matched" && data.room_code) {
        setStatus("matched");
        // Close socket gracefully
        try { socket.close(); } catch (e) {}
        socketRef.current = null;

        // Navigate to the room that your existing room logic uses
        navigate(`/room/${data.room_code}`);
        return;
      }

      // fallback: if some other structure comes
      console.warn("Unexpected matchmaking payload:", data);
    };

    socket.onerror = (ev) => {
      console.error("Matchmaking socket error:", ev);
      setStatus("error");
      try { socket.close(); } catch (e) {}
      socketRef.current = null;
    };

    socket.onclose = (ev) => {
      // If closed while searching/waiting but not matched, mark cancelled (unless matched already handled)
      if (status !== "matched") {
        if (status === "waiting" || status === "searching") {
          setStatus("cancelled");
        }
      }
      socketRef.current = null;
    };
  };

  const cancelPlay = () => {
    if (!socketRef.current) {
      setStatus("");
      return;
    }
    try {
      socketRef.current.close();
    } catch (e) {
      console.warn("Error closing matchmaking socket:", e);
    }
    socketRef.current = null;
    setStatus("cancelled");
  };

  return (
    <div style={{ padding: 20 }}>
      <h1>Dashboard</h1>

      {/* --- Play / Matchmaking controls --- */}
      <div style={{ marginBottom: 12 }}>
        <button
          onClick={startPlay}
          disabled={status === "searching" || status === "waiting"}
          style={{ marginRight: 8 }}
        >
          ▶ Play (Matchmaking)
        </button>

        <button
          onClick={cancelPlay}
          disabled={!socketRef.current && status !== "waiting" && status !== "searching"}
        >
          ✖ Cancel
        </button>
      </div>

      <div style={{ marginBottom: 16 }}>
        {status === "" && <small>Click Play to find a random opponent</small>}
        {status === "searching" && <small>Connecting to matchmaking server…</small>}
        {status === "waiting" && <small>Searching for opponent…</small>}
        {status === "matched" && <small>Matched! Redirecting…</small>}
        {status === "cancelled" && <small>Search cancelled.</small>}
        {status === "error" && <small style={{ color: "red" }}>Error — matchmaking failed.</small>}
      </div>

      <hr />

      {/* --- Keep your create/join logic exactly as before --- */}
      <div style={{ marginTop: 12 }}>
        <button onClick={() => navigate("/create-join")}>Create / Join Room</button>
        {/* If you have separate create / join routes, they remain unchanged.
            Replace the navigate targets above if your app uses different paths. */}
      </div>
    </div>
  );
}
