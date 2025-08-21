import React, { useState } from "react";
import GameLobby from "./GameLobby.jsx";

export default function App() {
  const [playerName, setPlayerName] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [joined, setJoined] = useState(false);

  const handleJoin = () => {
    if (playerName && roomCode) {
      setJoined(true);
    }
  };

  if (joined) {
    return <GameLobby playerName={playerName} roomCode={roomCode} />;
  }

  return (
    <div className="bg-animated app-container">
      <h1 className="neon-title">⚡ Buzz-In ⚡</h1>

      <input
        type="text"
        placeholder="Enter your name"
        value={playerName}
        onChange={(e) => setPlayerName(e.target.value)}
      />

      <input
        type="text"
        placeholder="Enter room code"
        value={roomCode}
        onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
      />

      <div className="buttons">
        <button className="btn btn-primary" onClick={handleJoin}>
          Join Game
        </button>
      </div>
    </div>
  );
}
