// client/src/socket.js
import { io } from "socket.io-client";

// Same-origin is correct for Render and for your custom domain.
const socket = io({
  autoConnect: true,
  transports: ["websocket", "polling"],
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 500,
  reconnectionDelayMax: 4000
});

// Simple debug logs. Remove if you want.
socket.on("connect", () => console.log("[socket] connected", socket.id));
socket.on("disconnect", (r) => console.log("[socket] disconnected", r));
socket.on("connect_error", (e) => console.error("[socket] connect_error", e?.message || e));
socket.on("error_message", (msg) => console.warn("[socket] error_message:", msg));

export default socket;
