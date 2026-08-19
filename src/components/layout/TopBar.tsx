import { Link, useLocation } from "react-router-dom";
import "./TopBar.css";

const TITLES: Record<string, string> = {
  "/": "Accueil",
  "/quotidien": "Quotidien",
  "/hebdomadaire": "Hebdomadaire",
  "/mensuel": "Mensuel",
  "/annuel": "Annuel",
  "/notes": "Notes",
  "/recherche": "Recherche",
};

export function TopBar() {
  const location = useLocation();
  const title = TITLES[location.pathname] ?? "Gestion Financiere";

  return (
    <header className="top-bar">
      <h1 className="top-bar__title">{title}</h1>
      <Link to="/recherche" className="top-bar__search" aria-label="Recherche globale">
        🔍
      </Link>
    </header>
  );
}
