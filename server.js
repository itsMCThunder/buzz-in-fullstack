import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: "*", methods: ["GET","POST"] },
});

// Cache control helpers
const noStore = (req, res, next) => {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  next();
};

// Static hosting: serve built client from /client-dist
const clientDist = path.join(__dirname, "client-dist");

// Never cache index shell
app.get("/", noStore, (req, res, next) => next());
app.get("/index.html", noStore, (req, res, next) => next());

// Serve static with smart caching
app.use(express.static(clientDist, {
  setHeaders: (res, filePath) => {
    const base = path.basename(filePath);
    const isHashed = /\.[a-f0-9]{8,}\./i.test(base);
    if (isHashed) {
      res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    } else {
      res.setHeader("Cache-Control", "no-cache");
    }
  }
}));

// Health
app.get("/health", (req, res) => res.json({ ok: true }));

// In-memory game state
const rooms = new Map(); // roomCode -> { hostId, players: Map<socketId,{id,name,score,team}>, buzzed: string|null }

function getRoomSnapshot(roomCode) {
  const room = rooms.get(roomCode);
  if (!room) return null;
  return {
    code: roomCode,
    hostId: room.hostId,
    players: Array.from(room.players.values()),
    buzzed: room.buzzed,
  };
}

io.on("connection", (socket) => {
  // create_room
  socket.on("create_room", (payload = {}) => {
    const roomCode = String(payload.roomCode || "").trim().toUpperCase();
    if (!roomCode) {
      socket.emit("error_message", "Missing room code");
      return;
    }
    let room = rooms.get(roomCode);
    if (!room) {
      room = { hostId: socket.id, players: new Map(), buzzed: null };
      rooms.set(roomCode, room);
    } else {
      room.hostId = socket.id;
    }
    socket.join(roomCode);
    socket.emit("room_update", getRoomSnapshot(roomCode));
  });

  // join_room
  socket.on("join_room", (payload = {}) => {
    const roomCode = String(payload.roomCode || "").trim().toUpperCase();
    const playerName = String(payload.playerName || "").trim() || "Player";
    const room = rooms.get(roomCode);
    if (!room) {
      socket.emit("error_message", "Room not found");
      return;
    }
    const player = { id: socket.id, name: playerName, score: 0, team: null };
    room.players.set(socket.id, player);
    socket.join(roomCode);
    io.to(roomCode).emit("room_update", getRoomSnapshot(roomCode));
  });

  // buzz
  socket.on("buzz", (payload = {}) => {
    const roomCode = String(payload.roomCode || "").trim().toUpperCase();
    const room = rooms.get(roomCode);
    if (!room) return;
    if (room.buzzed) return; // ignore after first buzz
    if (!room.players.has(socket.id)) return;
    room.buzzed = socket.id;
    io.to(roomCode).emit("room_update", getRoomSnapshot(roomCode));
  });

  // reset_buzz (host only)
  socket.on("reset_buzz", (payload = {}) => {
    const roomCode = String(payload.roomCode || "").trim().toUpperCase();
    const room = rooms.get(roomCode);
    if (!room) return;
    if (room.hostId !== socket.id) return;
    room.buzzed = null;
    io.to(roomCode).emit("room_update", getRoomSnapshot(roomCode));
  });

  // set_teams (bulk, host only): { assignments: { socketId: teamName } }
  socket.on("set_teams", (payload = {}) => {
    const roomCode = String(payload.roomCode || "").trim().toUpperCase();
    const assignments = payload.assignments || {};
    const room = rooms.get(roomCode);
    if (!room) return;
    if (room.hostId !== socket.id) return;
    for (const [sid, team] of Object.entries(assignments)) {
      const p = room.players.get(sid);
      if (p) p.team = team ?? null;
    }
    io.to(roomCode).emit("room_update", getRoomSnapshot(roomCode));
  });

  // assign_team (single, host only)
  socket.on("assign_team", (payload = {}) => {
    const roomCode = String(payload.roomCode || "").trim().toUpperCase();
    const targetId = String(payload.playerId || "");
    const team = payload.team ?? null;
    const room = rooms.get(roomCode);
    if (!room) return;
    if (room.hostId !== socket.id) return;
    const p = room.players.get(targetId);
    if (p) {
      p.team = team;
      io.to(roomCode).emit("room_update", getRoomSnapshot(roomCode));
    }
  });

  // award_points (host only)
  socket.on("award_points", (payload = {}) => {
    const roomCode = String(payload.roomCode || "").trim().toUpperCase();
    const targetId = String(payload.playerId || "");
    const delta = Number(payload.points || 0);
    const room = rooms.get(roomCode);
    if (!room) return;
    if (room.hostId !== socket.id) return;
    const p = room.players.get(targetId);
    if (p) {
      p.score = Math.max(0, (p.score || 0) + delta);
      io.to(roomCode).emit("room_update", getRoomSnapshot(roomCode));
    }
  });

  // disconnect cleanup
  socket.on("disconnect", () => {
    for (const [code, room] of rooms.entries()) {
      if (room.players.delete(socket.id)) {
        if (room.buzzed === socket.id) room.buzzed = null;
        io.to(code).emit("room_update", getRoomSnapshot(code));
      }
      if (room.hostId === socket.id) {
        io.to(code).emit("error_message", "Host disconnected");
        rooms.delete(code);
      }
    }
  });
});

// SPA fallback
app.get("*", noStore, (req, res) => {
  res.sendFile(path.join(clientDist, "index.html"));
});

const PORT = process.env.PORT || 10000;
httpServer.listen(PORT, () => {
  console.log(`Server running on ${PORT}`);
});
