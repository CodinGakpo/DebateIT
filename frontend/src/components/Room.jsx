import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";

export default function Room() {
  const { roomCode } = useParams();
  const socketRef = useRef(null);
  const [bg, setBg] = useState("white");

  useEffect(() => {
    socketRef.current = new WebSocket(`ws://localhost:8000/ws/room/${roomCode}/`);

    socketRef.current.onmessage = (e) => {
      const data = JSON.parse(e.data);

      if (data.type === "color_update") {
        setBg(data.color);
      }
    };

    return () => socketRef.current.close();
  }, []);

  function changeColor() {
    const newColor = bg === "white" ? "lightblue" : "white";

    setBg(newColor);

    socketRef.current.send(JSON.stringify({
      type: "change_color",
      color: newColor
    }));
  }

  return (
    <div style={{ height: "100vh", background: bg }}>
      <h1>Room: {roomCode}</h1>
      <button onClick={changeColor}>Toggle Background</button>
    </div>
  );
}
