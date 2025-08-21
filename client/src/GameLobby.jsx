import React, { useState, useEffect } from "react";
import io from "socket.io-client";

const socket = io();

export default function GameLobby({ playerName, roomCode }) {
  const [players, setPlayers] = useState([]);
  const [status, setStatus] = useState("online");

  useEffect(() => {
    socket.emit("join_room", { playerName, roomCode });

    socket.on("room_update", (room) => {
      setPlayers(room.players || []);
    });

    return () => {
      socket.off("room_update");
    };
  }, [playerName, roomCode]);

  return (
    <div className="bg-animated app-container">
      <h1 className="neon-title">Lobby: {roomCode}</h1>
      <p className={`status ${status}`}>Server {status}</p>

      <div className="players-list">
        {players.map((p) => (
          <div key={p.id} className="player-card">
            <span>{p.name}</span>
            <span className="score">{p.score}</span>
          </div>
        ))}
      </div>

      <div className="host-controls">
        <p className="controls-title">Host Controls</p>
        <div className="point-buttons">
          <button className="btn btn-positive">+ Points</button>
          <button className="btn btn-neutral">0 Points</button>
          <button className="btn btn-negative">- Points</button>
        </div>
      </div>
    </div>
  );
}
