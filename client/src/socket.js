// client/src/socket.js
import { io } from "socket.io-client";

const socket = io({
  // important for Cloudflare: be explicit
  path: "/socket.io",
  // allow fallback if websocket is blocked mid-proxy
  transports: ["websocket", "polling"],
  // be patient through CF handshakes
  timeout: 15000,
  autoConnect: true,
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 500,
  reconnectionDelayMax: 4000
});

socket.on("connect", () => console.log("[socket] connected", socket.id));
socket.on("disconnect", (reason) => console.log("[socket] disconnected", reason));
socket.on("connect_error", (e) => console.error("[socket] connect_error", e?.message || e));
socket.on("error_message", (msg) => console.warn("[socket] error_message:", msg));

export default socket;
