import { io } from "socket.io-client";

// Same-origin works for Render and your custom domain
const socket = io({
  autoConnect: true,
  transports: ["websocket", "polling"],
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 500,
  reconnectionDelayMax: 4000
});

// Optional logs for quick diagnosis
socket.on("connect", () => console.log("[socket] connected", socket.id));
socket.on("disconnect", (reason) => console.log("[socket] disconnected", reason));
socket.on("connect_error", (e) => console.error("[socket] connect_error", e?.message || e));
socket.on("error_message", (msg) => console.warn("[socket] error_message:", msg));

export default socket;
