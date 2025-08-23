import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import socket from "./socket";

function PlayerList({ players = [], buzzedId, isHost, onAward }) {
  return (
    <div className="mt-4 grid gap-2">
      {players.map((p) => {
        const buzzed = buzzedId === p.id;
        return (
          <div
            key={p.id}
            className={`flex items-center justify-between px-3 py-2 rounded-lg border ${
              buzzed ? "bg-amber-900/40 border-amber-600" : "bg-neutral-800 border-neutral-700"
            }`}
          >
            <div className="truncate">
              <span className="font-semibold">{p.name}</span>
              <span className="opacity-60"> · {p.id.slice(0, 6)}</span>
              {buzzed ? <span className="ml-2 px-2 py-0.5 text-sm rounded bg-amber-600">BUZZED</span> : null}
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-neutral-900 border border-neutral-700">
                {p.score ?? 0} pts
              </span>
              {isHost ? (
                <>
                  <button
                    className="px-2 py-1 rounded bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700"
                    onClick={() => onAward(p.id, 1)}
                  >
                    +1
                  </button>
                  <button
                    className="px-2 py-1 rounded bg-rose-600 hover:bg-rose-500 active:bg-rose-700"
                    onClick={() => onAward(p.id, -1)}
                  >
                    −1
                  </button>
                </>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function GameLobby({ roomCode }) {
  const [room, setRoom] = useState(null);
  const [selfId, setSelfId] = useState(null);
  const navigate = useNavigate();

  // connect once and capture our id
  useEffect(() => {
    if (!socket.connected) socket.connect();
    setSelfId(socket.id);

    const onUpdate = (snapshot) => {
      if (!snapshot) return;
      setRoom(snapshot);
    };
    const onErr = (msg) => {
      console.warn("[lobby] error_message:", msg);
    };

    socket.on("room_update", onUpdate);
    socket.on("error_message", onErr);

    // Ask server to ensure we are in the room context.
    // These are idempotent on the server side based on earlier setup.
    socket.emit("create_room", { roomCode });
    socket.emit("join_room", { roomCode, playerName: "Player" });

    return () => {
      socket.off("room_update", onUpdate);
      socket.off("error_message", onErr);
    };
  }, [roomCode]);

  const isHost = useMemo(() => room && selfId && room.hostId === selfId, [room, selfId]);

  const resetBuzz = useCallback(() => {
    socket.emit("reset_buzz", { roomCode });
  }, [roomCode]);

  const buzz = useCallback(() => {
    socket.emit("buzz", { roomCode });
  }, [roomCode]);

  const award = useCallback((sid, points) => {
    socket.emit("award_points", { roomCode, playerId: sid, points });
  }, [roomCode]);

  const leave = () => navigate("/");

  return (
    <div className="min-h-screen p-6 bg-neutral-950 text-neutral-100">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Room {roomCode}</h2>
          <button className="px-3 py-2 rounded-lg bg-neutral-800 border border-neutral-700" onClick={leave}>
            Leave
          </button>
        </div>

        {room ? (
