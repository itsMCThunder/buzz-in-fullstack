import React from "react";
import GameLobby from "./GameLobby.jsx";

function App() {
  return (
    <div className="bg-animated min-h-screen flex items-center justify-center">
      <div className="app-container">
        <h1 className="neon-title">Buzz-In Game</h1>
        <GameLobby />
      </div>
    </div>
  );
}

export default App;
