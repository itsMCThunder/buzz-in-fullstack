import React, { useState, useEffect } from "react";

export default function GameLobby({ socket, roomCode, isHost }) {
  const [players, setPlayers] = useState([]);
  const [scores, setScores] = useState({});
  const [buzzLocked, setBuzzLocked] = useState(false);

  useEffect(() => {
    socket.on("room_update", (room) => {
      setPlayers(room.players || []);
      setScores(
        room.players.reduce((acc, p) => {
          acc[p.id] = p.score;
          return acc;
        }, {})
      );
    });

    return () => {
      socket.off("room_update");
    };
  }, [socket]);

  const handleBuzz = () => {
    if (!buzzLocked) {
      socket.emit("buzz", { roomCode });
      setBuzzLocked(true);
    }
  };

  const handleUnlockBuzzers = () => {
    setBuzzLocked(false);
    socket.emit("unlock_buzzers", { roomCode });
  };

  const handleLockBuzzers = () => {
    setBuzzLocked(true);
    socket.emit("lock_buzzers", { roomCode });
  };

  return (
    <div className="app-container">
      <h2 className="neon-title">Room Code: {roomCode}</h2>

      <div className="players-list">
        {players.map((p) => (
          <div key={p.id} className="player-card">
            <span>{p.name}</span>
            <span className="score">{scores[p.id] ?? 0}</span>
          </div>
        ))}
      </div>

      {!isHost && (
        <button
          className={`buzz-btn ${buzzLocked ? "buzz-locked" : "buzz-active"}`}
          onClick={handleBuzz}
          disabled={buzzLocked}
        >
          BUZZ!
        </button>
      )}

      {isHost && (
        <div className="host-controls">
          <h3 className="controls-title">Host Controls</h3>
          <div className="point-buttons">
            <button className="btn btn-positive">+ Points</button>
            <button className="btn btn-neutral">0 Points</button>
            <button className="btn btn-negative">- Points</button>
          </div>
          <div className="buttons" style={{ marginTop: "15px" }}>
            <button className="btn btn-primary" onClick={handleUnlockBuzzers}>
              Unlock Buzzers
            </button>
            <button className="btn btn-secondary" onClick={handleLockBuzzers}>
              Lock Buzzers
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
