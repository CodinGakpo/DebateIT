import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function CreateJoin() {
  const [roomCode, setRoomCode] = useState("");
  const navigate = useNavigate();

  function createRoom() {
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    navigate(`/room/${code}`);
  }

  function joinRoom() {
    navigate(`/room/${roomCode}`);
  }

  return (
    <div>
      <h1>Create or Join Room</h1>

      <button onClick={createRoom}>Create</button>

      <input
        placeholder="Enter room code"
        onChange={(e) => setRoomCode(e.target.value)}
      />

      <button onClick={joinRoom}>Join</button>
    </div>
  );
}
