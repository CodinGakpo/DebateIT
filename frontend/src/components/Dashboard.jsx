import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useKindeAuth } from "@kinde-oss/kinde-auth-react";

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useKindeAuth();   // <-- only addition
  const [backendUser, setBackendUser] = useState(null);
//DEBUG TOKEN
  const { getToken } = useKindeAuth();

useEffect(() => {
  async function showToken() {
    const token = await getToken();
    console.log("TOKEN FOR INSOMNIA:", token);
  }
  showToken();
}, []);

  // Matchmaking state
  const [status, setStatus] = useState(""); 
  const socketRef = useRef(null);

  // cleanup websocket on unmount
  useEffect(() => {
    return () => {
      if (socketRef.current) {
        try { socketRef.current.close(); } catch (e) {}
        socketRef.current = null;
      }
    };
  }, []);

  const startPlay = () => {
    if (status === "searching" || status === "waiting") return;

    if (socketRef.current) {
      try { socketRef.current.close(); } catch (e) {}
      socketRef.current = null;
    }

    setStatus("searching");

    const socket = new WebSocket("ws://localhost:8000/ws/matchmaking/");
    socketRef.current = socket;

    socket.onopen = () => {
      try {
        socket.send(JSON.stringify({ action: "find_match" }));
        setStatus("waiting");
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
        console.error("Invalid matchmaking message:", evt.data);
        return;
      }

      if (data.status === "waiting") {
        setStatus("waiting");
      } else if (data.status === "matched" && data.room_code) {
        setStatus("matched");
        try { socket.close(); } catch (e) {}
        socketRef.current = null;
        navigate(`/room/${data.room_code}`);
      } else {
        console.warn("Unexpected matchmaking payload:", data);
      }
    };

    socket.onerror = (ev) => {
      console.error("Matchmaking socket error:", ev);
      setStatus("error");
      try { socket.close(); } catch (e) {}
      socketRef.current = null;
    };

    socket.onclose = () => {
      if (status !== "matched" && (status === "waiting" || status === "searching")) {
        setStatus("cancelled");
      }
      socketRef.current = null;
    };
  };

  const cancelPlay = () => {
    if (socketRef.current) {
      try { socketRef.current.close(); } catch (e) {}
    }
    socketRef.current = null;
    setStatus("cancelled");
  };

  return (
    <div style={{ padding: 20 }}>
      <h1>Dashboard</h1>

      {/* ✅ Added: User Profile Section — SAFE & SMALL */}
      <div style={{ marginBottom: 20, padding: 10, border: "1px solid #ccc" }}>
        <h3>Your Profile</h3>
        <p><strong>Email:</strong> {user?.email}</p>
        <p><strong>User ID:</strong> {user?.id}</p>
      </div>

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

      {/* Create/Join stays EXACTLY THE SAME */}
      <div style={{ marginTop: 12 }}>
        <button onClick={() => navigate("/create-join")}>
          Create / Join Room
        </button>
      </div>
    </div>
  );
}
