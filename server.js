// server.js
import express from "express";
import compression from "compression";
import { createServer } from "http";
import { Server } from "socket.io";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isProd = process.env.NODE_ENV === "production";

const app = express();
app.disable("x-powered-by");
if (!isProd) app.set("etag", false);
app.use(compression());

// never cache index shell
const noStore = (req, res, next) => {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  next();
};

// built client dir
const clientDist = path.join(__dirname, "client-dist");

// loud sanity checks so we don’t silently serve blank HTML
const htmlPath = path.join(clientDist, "index.html");
if (!fs.existsSync(clientDist)) {
  console.error("ERROR: client-dist not found. Did the client build run?");
}
if (!fs.existsSync(htmlPath)) {
  console.error("ERROR: client-dist/index.html missing. Build is incomplete or failed.");
}

// override caching for shell
app.get("/", noStore, (req, res, next) => next());
app.get("/index.html", noStore, (req, res, next) => next());

// static files: cache hashed assets strongly, others lightly
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
    }
  })
);

// health
app.get("/health", (req, res) => res.json({ ok: true }));

// simple debug endpoint to verify build presence in production
app.get("/__debug/build-info", (req, res) => {
  try {
    const entries = fs.existsSync(clientDist) ? fs.readdirSync(clientDist) : [];
    const assetsDir = path.join(clientDist, "assets");
    const assets = fs.existsSync(assetsDir) ? fs.readdirSync(assetsDir).filter(f => f.endsWith(".css") || f.endsWith(".js")) : [];
    res.json({
      clientDistExists: fs.existsSync(clientDist),
      indexHtmlExists: fs.existsSync(htmlPath),
      assetSamples: assets.slice(0, 10)
    });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

// Socket.IO
const httpServer = createServer(app);
const io = new Server(httpServer, { cors: { origin: "*", methods: ["GET","POST"] } });

// in-memory game state
const rooms = new Map(); // code -> { hostId, players: Map<sid,{id,name,score,team}>, buzzed: sid|null }

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
      const pl = room.players.get(sid);
      if (pl) pl.team = team ?? null;
    }
    io.to(code).emit("room_update", snapshot(code));
  });

  socket.on("assign_team", (p = {}) => {
    const code = String(p.roomCode || "").trim().toUpperCase();
    const room = rooms.get(code);
    if (!room || room.hostId !== socket.id) return;
    const pl = room.players.get(String(p.playerId || ""));
    if (pl) {
      pl.team = p.team ?? null;
      io.to(code).emit("room_update", snapshot(code));
    }
  });

  socket.on("award_points", (p = {}) => {
    const code = String(p.roomCode || "").trim().toUpperCase();
    const room = rooms.get(code);
    if (!room || room.hostId !== socket.id) return;
    const pl = room.players.get(String(p.playerId || ""));
    if (pl) {
      pl.score = Math.max(0, (pl.score || 0) + Number(p.points || 0));
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

// SPA fallback serves the built shell only
app.get("*", noStore, (req, res) => {
  res.sendFile(htmlPath);
});

const PORT = process.env.PORT || 10000;
httpServer.listen(PORT, () => {
  console.log(`Server running on ${PORT}`);
  console.log(`Serving client from: ${clientDist}`);
});
