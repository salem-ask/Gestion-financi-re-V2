import { Card } from "./Card";
import "./PagePlaceholder.css";

interface PagePlaceholderProps {
  titre: string;
  description: string;
}

/** Ecran d'attente pour les sections dont la logique metier arrive dans une etape suivante. */
export function PagePlaceholder({ titre, description }: PagePlaceholderProps) {
  return (
    <Card className="page-placeholder">
      <h2 className="page-placeholder__title">{titre}</h2>
      <p className="page-placeholder__text">{description}</p>
    </Card>
  );
}
