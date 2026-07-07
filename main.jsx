import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";

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
