import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, { cors: { origin: "*", methods: ["GET","POST"] } });

// ---------- Cache controls ----------
const noStore = (req, res, next) => {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  next();
};

// ---------- Paths (preserve your structure) ----------
const clientDist = path.join(__dirname, "client-dist");

// Never cache the shell so new hashed CSS/JS are always picked up after deploy
app.get("/", noStore, (req, res, next) => next());
app.get("/index.html", noStore, (req, res, next) => next());

// Static with smart caching: long cache for hashed files, no‑cache for others
app.use(
  express.static(clientDist, {
    setHeaders: (res, filePath) => {
      const base = path.basename(filePath);
      const isHashed = /\.[a-f0-9]{8,}\./i.test(base);
      if (isHashed) {
        res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
      } else {
        res.setHeader("Cache-Control", "no-cache");
      }
    },
  })
);

// Health
app.get("/health", (req, res) => res.json({ ok: true }));

// ---------- Minimal game state (unchanged semantics) ----------
const rooms = new Map(); // code -> { hostId, players: Map, buzzed }

const snapshot = (code) => {
  const r = rooms.get(code);
  if (!r) return null;
  return { code, hostId: r.hostId, players: Array.from(r.players.values()), buzzed: r.buzzed };
};

io.on("connection", (socket) => {
  socket.on("create_room", (p = {}) => {
    const code = String(p.roomCode || "").trim().toUpperCase();
    if (!code) return socket.emit("error_message", "Missing room code");
    if (!rooms.has(code)) rooms.set(code, { hostId: socket.id, players: new Map(), buzzed: null });
    else rooms.get(code).hostId = socket.id;
    socket.join(code);
    socket.emit("room_update", snapshot(code));
  });

  socket.on("join_room", (p = {}) => {
    const code = String(p.roomCode || "").trim().toUpperCase();
    const room = rooms.get(code);
    if (!room) return socket.emit("error_message", "Room not found");
    const player = { id: socket.id, name: String(p.playerName || "Player"), score: 0, team: null };
    room.players.set(socket.id, player);
    socket.join(code);
    io.to(code).emit("room_update", snapshot(code));
  });

  socket.on("buzz", (p = {}) => {
    const code = String(p.roomCode || "").trim().toUpperCase();
    const room = rooms.get(code);
    if (!room || room.buzzed || !room.players.has(socket.id)) return;
    room.buzzed = socket.id;
    io.to(code).emit("room_update", snapshot(code));
  });

  socket.on("reset_buzz", (p = {}) => {
    const code = String(p.roomCode || "").trim().toUpperCase();
    const room = rooms.get(code);
    if (!room || room.hostId !== socket.id) return;
    room.buzzed = null;
    io.to(code).emit("room_update", snapshot(code));
  });

  socket.on("set_teams", (p = {}) => {
    const code = String(p.roomCode || "").trim().toUpperCase();
    const room = rooms.get(code);
    if (!room || room.hostId !== socket.id) return;
    for (const [sid, team] of Object.entries(p.assignments || {})) {
      const player = room.players.get(sid);
      if (player) player.team = team ?? null;
    }
    io.to(code).emit("room_update", snapshot(code));
  });

  socket.on("assign_team", (p = {}) => {
    const code = String(p.roomCode || "").trim().toUpperCase();
    const room = rooms.get(code);
    if (!room || room.hostId !== socket.id) return;
    const player = room.players.get(String(p.playerId || ""));
    if (player) {
      player.team = p.team ?? null;
      io.to(code).emit("room_update", snapshot(code));
    }
  });

  socket.on("award_points", (p = {}) => {
    const code = String(p.roomCode || "").trim().toUpperCase();
    const room = rooms.get(code);
    if (!room || room.hostId !== socket.id) return;
    const player = room.players.get(String(p.playerId || ""));
    if (player) {
      player.score = Math.max(0, (player.score || 0) + Number(p.points || 0));
      io.to(code).emit("room_update", snapshot(code));
    }
  });

  socket.on("disconnect", () => {
    for (const [code, room] of rooms.entries()) {
      if (room.players.delete(socket.id)) {
        if (room.buzzed === socket.id) room.buzzed = null;
        io.to(code).emit("room_update", snapshot(code));
      }
      if (room.hostId === socket.id) {
        io.to(code).emit("error_message", "Host disconnected");
        rooms.delete(code);
      }
    }
  });
});

// SPA fallback: never cache shell
app.get("*", noStore, (req, res) => {
  res.sendFile(path.join(clientDist, "index.html"));
});

const PORT = process.env.PORT || 10000;
httpServer.listen(PORT, () => console.log(`Server running on ${PORT}`));
