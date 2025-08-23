import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import "./index.css";  // keep Tailwind/global CSS imported here

createRoot(document.getElementById("root")).render(<App />);
