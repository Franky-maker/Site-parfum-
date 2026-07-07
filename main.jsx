import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";

// Petit remplacement de window.storage pour que le site fonctionne
// correctement en dehors de Claude (les commandes partent par email).
if (!window.storage) {
  window.storage = {
    get: async () => null,
    set: async () => ({ ok: true }),
    delete: async () => ({ ok: true }),
    list: async () => ({ keys: [] }),
  };
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
