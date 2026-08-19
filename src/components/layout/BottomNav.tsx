import { NavLink } from "react-router-dom";
import "./BottomNav.css";

const NAV_ITEMS = [
  { to: "/", label: "Accueil", icon: "🏠", end: true },
  { to: "/quotidien", label: "Quotidien", icon: "📅", end: false },
  { to: "/hebdomadaire", label: "Semaine", icon: "🗓️", end: false },
  { to: "/mensuel", label: "Mois", icon: "📆", end: false },
  { to: "/annuel", label: "Annee", icon: "📈", end: false },
  { to: "/notes", label: "Notes", icon: "📝", end: false },
] as const;

/**
 * Navigation principale : barre basse sur mobile, devient une barre
 * laterale sur grand ecran via CSS (voir BottomNav.css). Un seul
 * composant, une seule source de verite pour les liens.
 */
export function BottomNav() {
  return (
    <nav className="bottom-nav" aria-label="Navigation principale">
      <ul className="bottom-nav__list">
        {NAV_ITEMS.map((item) => (
          <li key={item.to} className="bottom-nav__item">
            <NavLink
              to={item.to}
              end={item.end}
              className={({ isActive }) => `bottom-nav__link ${isActive ? "is-active" : ""}`.trim()}
            >
              <span className="bottom-nav__icon" aria-hidden="true">
                {item.icon}
              </span>
              <span className="bottom-nav__label">{item.label}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
