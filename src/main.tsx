import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./App";
import { storageService } from "@/services/storage";
import "@/utils/theme";
import "@/styles/global.css";

storageService.init().catch((error) => {
  console.error("Echec de l'initialisation du stockage local", error);
});

if ("serviceWorker" in navigator && import.meta.env.PROD) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch((error) => {
      console.error("Echec de l'enregistrement du service worker", error);
    });
  });
}

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
