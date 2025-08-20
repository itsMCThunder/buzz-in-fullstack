import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import path from "path";
import { fileURLToPath } from "url";

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, { cors: { origin: "*" } });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rooms = {};

io.on("connection", (socket) => {
  console.log("Client connected:", socket.id);

  socket.on("create_room", ({ hostName, mode }, callback) => {
    const code = Math.random().toString(36).substring(2, 7).toUpperCase();
    rooms[code] = {
      hostId: socket.id,
      mode,
      players: [{ id: socket.id, name: hostName, score: 0 }],
      buzzed: null,
      teams: { A: { name: null, score: 0 }, B: { name: null, score: 0 } },
      queue: [],
    };
    socket.join(code);
    callback({ ok: true, roomCode: code });
    io.to(code).emit("room_update", rooms[code]);
  });

  socket.on("join_room", ({ roomCode, name }, callback) => {
    const room = rooms[roomCode];
    if (!room) return callback({ ok: false, error: "Room not found" });
    room.players.push({ id: socket.id, name, score: 0 });
    socket.join(roomCode);
    callback({ ok: true });
    io.to(roomCode).emit("room_update", room);
  });

  socket.on("buzz", ({ roomCode }) => {
    const room = rooms[roomCode];
    if (room && !room.buzzed) {
      room.buzzed = socket.id;
      room.queue.push(socket.id);
      io.to(roomCode).emit("room_update", room);
      io.to(roomCode).emit("queue_update", room.queue);
    }
  });

  socket.on("award_points", ({ roomCode, playerId, points }) => {
    const room = rooms[roomCode];
    if (room && room.hostId === socket.id) {
      const player = room.players.find((p) => p.id === playerId);
      if (player) {
        player.score += points;
        if (player.team) {
          room.teams[player.team].score += points;
        }
      }
      io.to(roomCode).emit("room_update", room);
    }
  });

  socket.on("reset_buzz", ({ roomCode }) => {
    const room = rooms[roomCode];
    if (room && room.hostId === socket.id) {
      room.buzzed = null;
      room.queue = [];
      io.to(roomCode).emit("room_update", room);
      io.to(roomCode).emit("queue_update", []);
    }
  });

  socket.on("set_teams", ({ roomCode, teamA, teamB }) => {
    const room = rooms[roomCode];
    if (room && room.hostId === socket.id) {
      room.teams.A.name = teamA;
      room.teams.B.name = teamB;
      io.to(roomCode).emit("room_update", room);
    }
  });

  socket.on("assign_team", ({ roomCode, playerId, teamKey }) => {
    const room = rooms[roomCode];
    if (room) {
      const player = room.players.find((p) => p.id === playerId);
      if (player) {
        player.team = teamKey;
        io.to(roomCode).emit("room_update", room);
      }
    }
  });

  socket.on("disconnect", () => {
    for (const [code, room] of Object.entries(rooms)) {
      room.players = room.players.filter((p) => p.id !== socket.id);
      if (room.hostId === socket.id) {
        io.to(code).emit("room_closed");
        delete rooms[code];
      } else {
        io.to(code).emit("room_update", room);
      }
    }
  });
});

app.use(express.static(path.join(__dirname, "client-dist")));

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "client-dist", "index.html"));
});

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => console.log(`Server running on ${PORT}`));

