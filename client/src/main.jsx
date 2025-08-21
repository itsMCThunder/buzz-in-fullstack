import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import io from "socket.io-client";

const socket = io("https://buzz-in-server-1.onrender.com"); // Render server URL

function App() {
  const [roomCode, setRoomCode] = useState("");
  const [playerName, setPlayerName] = useState("");
  const [isHost, setIsHost] = useState(false);
  const [room, setRoom] = useState(null);
  const [serverConnected, setServerConnected] = useState(false);

  // Socket listeners
  useEffect(() => {
    socket.on("connect", () => setServerConnected(true));
    socket.on("disconnect", () => setServerConnected(false));

    socket.on("room_update", (data) => setRoom({ ...data }));
    socket.on("room_closed", () => {
      alert("Host ended the game");
      setRoom(null);
      setIsHost(false);
    });

    return () => {
      socket.off("connect");
      socket.off("disconnect");
      socket.off("room_update");
      socket.off("room_closed");
    };
  }, []);

  // Actions
  const createRoom = () => {
    if (!playerName) return alert("Enter your name first!");
    socket.emit("create_room", { hostName: playerName, mode: "free" }, ({ ok, roomCode }) => {
      if (ok) {
        setRoomCode(roomCode);
        setIsHost(true);
      }
    });
  };

  const joinRoom = () => {
    if (!playerName || !roomCode) return alert("Enter your name and room code!");
    socket.emit("join_room", { roomCode, name: playerName }, ({ ok, error }) => {
      if (!ok) return alert(error);
      setIsHost(false);
    });
  };

  const buzz = () => socket.emit("buzz", { roomCode });
  const awardPoints = (id, pts) => socket.emit("award_points", { roomCode, playerId: id, points: pts });
  const resetBuzz = () => socket.emit("reset_buzz", { roomCode });

  // Landing screen (pre-lobby)
  if (!room) {
    return (
      <div className="app-container bg-animated">
        <header>
          <h1 className="neon-title">Buzz-In Game</h1>
          <div className={`status ${serverConnected ? "online" : "offline"}`}>
            {serverConnected ? "🟢 Server Connected" : "🔴 Server Offline"}
          </div>
        </header>

        <div className="lobby">
          <input
            type="text"
            placeholder="Your Name"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
          />
          <div className="buttons">
            <button onClick={createRoom} className="btn btn-primary">Host Game</button>
          </div>
          <input
            type="text"
            placeholder="Room Code"
            value={roomCode}
            onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
          />
          <div className="buttons">
            <button onClick={joinRoom} className="btn btn-secondary">Join Game</button>
          </div>
        </div>
      </div>
    );
  }

  // Game room
  return (
    <div className="app-container bg-animated">
      <header>
        <h1 className="neon-title">Room: {roomCode}</h1>
        <div className={`status ${serverConnected ? "online" : "offline"}`}>
          {serverConnected ? "🟢 Server Connected" : "🔴 Server Offline"}
        </div>
      </header>

      <div className="players-list">
        {room.players.map((p) => (
          <div key={p.id} className="player-card">
            <span>{p.name}</span>
            <span className="score">{p.score} pts</span>
            {isHost && (
              <div>
                <button onClick={() => awardPoints(p.id, 1)} className="btn btn-positive">+1</button>
                <button onClick={() => awardPoints(p.id, -1)} className="btn btn-negative">-1</button>
              </div>
            )}
          </div>
        ))}
      </div>

      {!isHost && (
        <button
          onClick={buzz}
          disabled={room.buzzed !== null}
          className={`buzz-btn ${room.buzzed === null ? "buzz-active" : "buzz-locked"}`}
        >
          Buzz!
        </button>
      )}

      {isHost && (
        <div className="host-controls">
          <h2 className="controls-title">Host Controls</h2>
          <button onClick={resetBuzz} className="btn btn-neutral">Reset Buzz</button>
        </div>
      )}

      {room.buzzed && (
        <div className="buzz-indicator">
          Buzzed: {room.players.find((p) => p.id === room.buzzed)?.name}
        </div>
      )}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
