import React, { useState, useEffect } from "react";
import io from "socket.io-client";
import GameLobby from "./GameLobby";

const socket = io();

export default function App() {
  const [playerName, setPlayerName] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [connected, setConnected] = useState(socket.connected);
  const [inLobby, setInLobby] = useState(false);
  const [isHost, setIsHost] = useState(false);

  useEffect(() => {
    socket.on("connect", () => setConnected(true));
    socket.on("disconnect", () => setConnected(false));
  }, []);

  const handleCreateRoom = () => {
    socket.emit("create_room", { hostName: playerName, mode: "free" }, (res) => {
      if (res.ok) {
        setRoomCode(res.roomCode);
        setIsHost(true);
        setInLobby(true);
      }
    });
  };

  const handleJoinRoom = () => {
    socket.emit("join_room", { name: playerName, code: roomCode }, (res) => {
      if (res.ok) {
        setInLobby(true);
      } else {
        alert(res.message || "Failed to join room.");
      }
    });
  };

  if (inLobby) {
    return <GameLobby socket={socket} roomCode={roomCode} isHost={isHost} />;
  }

  return (
    <div className="app-container">
      <h1 className="neon-title">Buzz In!</h1>

      <div className="status">
        {connected ? (
          <span className="online">Server Online</span>
        ) : (
          <span className="offline">Server Offline</span>
        )}
      </div>

      <input
        type="text"
        placeholder="Enter your name"
        value={playerName}
        onChange={(e) => setPlayerName(e.target.value)}
      />

      <input
        type="text"
        placeholder="Room Code"
        value={roomCode}
        onChange={(e) => setRoomCode(e.target.value)}
      />

      <div className="buttons">
        <button className="btn btn-primary" onClick={handleCreateRoom}>
          Create Room
        </button>
        <button className="btn btn-secondary" onClick={handleJoinRoom}>
          Join Room
        </button>
      </div>
    </div>
  );
}
