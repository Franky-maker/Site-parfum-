import { useState } from "react";

export default function FlScents() {
  const [panier, setPanier] = useState({});

  return (
    <div style={{ background: "#f1e7d3", color: "#221b12", minHeight: "100vh", padding: "20px" }}>
      <h1>Fl.scents — Curated Fragrances</h1>
      <p>Bienvenue ! Votre site est en ligne. 🎉</p>
      <p>Les commandes et messages vous arrivent à: francisfregeau6@gmail.com</p>
      <button onClick={() => alert('Site en ligne!')}>Tester le site</button>
    </div>
  );
}
