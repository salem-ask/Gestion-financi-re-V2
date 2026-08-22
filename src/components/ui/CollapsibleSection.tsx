import { useState, type ReactNode } from "react";
import "./CollapsibleSection.css";

interface CollapsibleSectionProps {
  title: string;
  icon?: string;
  panelId: string;
  defaultOpen?: boolean;
  children: ReactNode;
}

/**
 * Section repliable generique (en-tete cliquable + panneau afficher/masquer).
 * Mecanisme unique reutilise par toutes les sections pliables du formulaire
 * Quotidien (affectations saisie, affectations resume, notes) : evite de
 * dupliquer la meme logique open/fermeture partout. Purement une question
 * d'affichage, ne touche jamais aux donnees/etat contenus dans children.
 */
export function CollapsibleSection({ title, icon, panelId, defaultOpen = false, children }: CollapsibleSectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="collapsible-section">
      <button
        type="button"
        className="collapsible-section__toggle"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        aria-controls={panelId}
      >
        {icon && <span aria-hidden="true">{icon}</span>} {title}{" "}
        <span className="collapsible-section__chevron" aria-hidden="true">
          {open ? "▲" : "▼"}
        </span>
      </button>
      {open && (
        <div id={panelId} className="collapsible-section__panel">
          {children}
        </div>
      )}
    </div>
  );
}
