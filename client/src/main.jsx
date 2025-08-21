import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import io from "socket.io-client";

const socket = io("https://buzz-in-server-1.onrender.com"); // Update if needed

function App() {
  const [roomCode, setRoomCode] = useState("");
  const [playerName, setPlayerName] = useState("");
  const [isHost, setIsHost] = useState(false);
  const [room, setRoom] = useState(null);
  const [serverConnected, setServerConnected] = useState(false);

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

  const createRoom = () => {
    if (!playerName) return alert("Enter your name first!");
    socket.emit("create_room", { hostName: playerName }, ({ ok, roomCode }) => {
      if (ok) {
        setRoomCode(roomCode);
        setIsHost(true);
      }
    });
  };

  const joinRoom = () => {
    if (!playerName || !roomCode) return alert("Enter name and room code!");
    socket.emit("join_room", { roomCode, name: playerName }, ({ ok, error }) => {
      if (!ok) return alert(error);
      setIsHost(false);
    });
  };

  const buzz = () => socket.emit("buzz", { roomCode });
  const awardPoints = (id, pts) =>
    socket.emit("award_points", { roomCode, playerId: id, points: pts });
  const resetBuzz = () => socket.emit("reset_buzz", { roomCode });

  // Pre-game lobby
  if (!room) {
    return (
      <div className="app-container">
        <h1>Buzz-In</h1>
        <div className={`status ${serverConnected ? "online" : "offline"}`}>
          {serverConnected ? "🟢 Connected" : "🔴 Offline"}
        </div>
        <input
          type="text"
          placeholder="Your Name"
          value={playerName}
          onChange={(e) => setPlayerName(e.target.value)}
          className="p-2 rounded mb-2"
        />
        <div>
          <button onClick={createRoom} className="btn btn-primary">
            Host Game
          </button>
        </div>
        <input
          type="text"
          placeholder="Room Code"
          value={roomCode}
          onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
          className="p-2 rounded mb-2"
        />
        <button onClick={joinRoom} className="btn btn-secondary">
          Join Game
        </button>
      </div>
    );
  }

  // In-game
  return (
    <div className="app-container">
      <h2>Room: {roomCode}</h2>

      <div className="players-list">
        {room.players.map((p) => (
          <div key={p.id} className="player-card">
            <span>{p.name}</span>
            <span className="score">{p.score} pts</span>
            {isHost && (
              <span>
                <button
                  onClick={() => awardPoints(p.id, 1)}
                  className="btn btn-primary"
                >
                  +1
                </button>
                <button
                  onClick={() => awardPoints(p.id, -1)}
                  className="btn btn-danger"
                >
                  -1
                </button>
              </span>
            )}
          </div>
        ))}
      </div>

      {!isHost && (
        <button
          onClick={buzz}
          disabled={room.buzzed !== null}
          className={`buzz-btn ${room.buzzed === null ? "active" : ""}`}
        >
          Buzz!
        </button>
      )}

      {isHost && (
        <div className="host-controls">
          <h3>Host Controls</h3>
          <button onClick={resetBuzz} className="btn btn-secondary">
            Reset Buzz
          </button>
        </div>
      )}

      {room.buzzed && (
        <div className="mt-4 text-lg font-bold">
          Buzzed: {room.players.find((p) => p.id === room.buzzed)?.name}
        </div>
      )}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
