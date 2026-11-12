import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import PremiumSimulator from "./pages/PremiumSimulator";
import "./styles.css";
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    {import.meta.env.VITE_ELEVA_PREMIUM === "true" ? <PremiumSimulator /> : <App />}
  </React.StrictMode>,
);
