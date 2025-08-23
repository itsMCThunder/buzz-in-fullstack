// client/src/App.jsx
import React, { useEffect, useMemo, useState } from "react";
import { BrowserRouter, Routes, Route, useNavigate, useParams } from "react-router-dom";
import socket from "./socket";
import GameLobby from "./GameLobby.jsx";
import "./index.css";

// Helper to make clean 4-6 char codes
function makeRoomCode(len = 5) {
  const alpha = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < len; i++) out += alpha[Math.floor(Math.random() * alpha.length)];
  return out;
}

function Home() {
  const [roomCode, setRoomCode] = useState("");
  const [playerName, setPlayerName] = useState("");
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  // Ensure socket is connected
  useEffect(() => {
    if (!socket.connected) socket.connect();
  }, []);

  // Handle server errors
  useEffect(() => {
    const onErr = (msg) => {
      alert(typeof msg === "string" ? msg : "An error occurred");
      setBusy(false);
    };
    socket.on("error_message", onErr);
    return () => socket.off("error_message", onErr);
  }, []);

  const doHost = async () => {
    if (busy) return;
    setBusy(true);
    const code = (roomCode || makeRoomCode()).toUpperCase().trim();
    // Navigate immediately, then let Lobby subscribe to updates
    socket.emit("create_room", { roomCode: code });
    navigate(`/room/${code}`);
  };

  const doJoin = async () => {
    if (busy) return;
    const code = roomCode.toUpperCase().trim();
    if (!code) {
      alert("Enter a room code");
      return;
    }
    const name = playerName.trim() || "Player";
    setBusy(true);
    // Try to join, then go to lobby
    socket.emit("join_room", { roomCode: code, playerName: name });
    navigate(`/room/${code}`);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-neutral-950 text-neutral-100">
      <div className="w-full max-w-xl space-y-6">
        <h1 className="text-3xl font-bold text-center">Buzz‑in</h1>

        <div className="p-4 rounded-xl bg-neutral-900 border border-neutral-800">
          <label className="block text-sm mb-1">Room code</label>
          <input
            className="w-full px-3 py-2 rounded-lg bg-neutral-800 border border-neutral-700 outline-none"
            placeholder="ABC12"
            value={roomCode}
            onChange={(e) => setRoomCode(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") doJoin();
            }}
          />
          <div className="mt-4 grid grid-cols-2 gap-3">
            <button
              className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 disabled:opacity-60"
              onClick={doHost}
              disabled={busy}
            >
              Host
            </button>
            <button
              className="px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 active:bg-sky-700 disabled:opacity-60"
              onClick={doJoin}
              disabled={busy}
            >
              Join
            </button>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-neutral-900 border border-neutral-800">
          <label className="block text-sm mb-1">Your name (optional for join)</label>
          <input
            className="w-full px-3 py-2 rounded-lg bg-neutral-800 border border-neutral-700 outline-none"
            placeholder="Player"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") doJoin();
            }}
          />
        </div>
      </div>
    </div>
  );
}

function LobbyWrapper() {
  const { code } = useParams();
  const roomCode = useMemo(() => (code || "").toUpperCase(), [code]);
  return <GameLobby roomCode={roomCode} />;
}

export default function AppRoot() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/room/:code" element={<LobbyWrapper />} />
        <Route path="*" element={<Home />} />
      </Routes>
    </BrowserRouter>
  );
}
