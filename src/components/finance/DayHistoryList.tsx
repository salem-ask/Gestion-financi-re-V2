import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { formatMontant } from "@/utils/format";
import { formatDateFr } from "@/utils/date";
import { getGenerosityDisplay } from "@/services/finance";
import { getCategoryLabel } from "@/types";
import type { DayEntry, CustomDepenseCategory } from "@/types";
import "./DayHistoryList.css";

interface DayHistoryListProps {
  days: DayEntry[];
  onEdit: (day: DayEntry) => void;
  onDelete: (day: DayEntry) => void;
  customCategories?: CustomDepenseCategory[];
}

export function DayHistoryList({ days, onEdit, onDelete, customCategories = [] }: DayHistoryListProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (days.length === 0) {
    return <p className="day-history__empty">Aucune journee enregistree pour le moment.</p>;
  }

  // Plus recent en premier.
  const sorted = [...days].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <ul className="day-history">
      {sorted.map((day) => {
        const generosity = getGenerosityDisplay(day.totals);
        const expanded = expandedId === day.id;

        return (
          <li key={day.id}>
            <Card className="day-history__card">
              <div className="day-history__header">
                <span className="day-history__date">{formatDateFr(day.date)}</span>
                <span className="day-history__gain">{formatMontant(day.totals.gain)}</span>
              </div>

              <div className="day-history__grid">
                <div>
                  <span className="day-history__label">Achats</span>
                  <span className="day-history__value">{formatMontant(day.totals.achat)}</span>
                </div>
                <div>
                  <span className="day-history__label">Ventes</span>
                  <span className="day-history__value">{formatMontant(day.totals.vente)}</span>
                </div>
                <div>
                  <span className="day-history__label">Depenses</span>
                  <span className="day-history__value">{formatMontant(day.totals.depense)}</span>
                </div>
                <div>
                  <span className="day-history__label">Dime</span>
                  <span className="day-history__value">{formatMontant(day.totals.dime)}</span>
                </div>
                <div>
                  <span className="day-history__label">Epargne</span>
                  <span className="day-history__value">{formatMontant(day.totals.epargne)}</span>
                </div>
                <div>
                  <span className="day-history__label">Reste</span>
                  <span className="day-history__value">{formatMontant(day.totals.reste)}</span>
                </div>
              </div>

              <div className="day-history__generosity">
                <span>Generosite prevue {formatMontant(generosity.planned)}</span>
                <span>Donnee {formatMontant(generosity.given)}</span>
                <span>Restante {formatMontant(generosity.remaining)}</span>
                {generosity.overage > 0 && (
                  <span className="day-history__overage">Depassement {formatMontant(generosity.overage)}</span>
                )}
              </div>

              <div className="day-history__actions">
                <button
                  type="button"
                  className="day-history__action"
                  onClick={() => setExpandedId(expanded ? null : day.id)}
                >
                  {expanded ? "Masquer les details" : "Voir les details"}
                </button>
                <button type="button" className="day-history__action" onClick={() => onEdit(day)}>
                  Modifier
                </button>
                <button
                  type="button"
                  className="day-history__action day-history__action--danger"
                  onClick={() => onDelete(day)}
                >
                  Supprimer
                </button>
              </div>

              {expanded && (
                <div className="day-history__details">
                  <DetailGroup title="Achats" items={day.achats} />
                  <DetailGroup title="Ventes" items={day.ventes} />
                  <DetailGroup title="Depenses" items={day.depenses} showCategorie customCategories={customCategories} />
                </div>
              )}
            </Card>
          </li>
        );
      })}
    </ul>
  );
}

function DetailGroup({
  title,
  items,
  showCategorie = false,
  customCategories = [],
}: {
  title: string;
  items: DayEntry["achats"];
  showCategorie?: boolean;
  customCategories?: CustomDepenseCategory[];
}) {
  if (items.length === 0) {
    return (
      <div className="day-history__detail-group">
        <p className="day-history__detail-title">{title}</p>
        <p className="day-history__detail-empty">Aucune ligne</p>
      </div>
    );
  }

  return (
    <div className="day-history__detail-group">
      <p className="day-history__detail-title">{title}</p>
      <ul className="day-history__detail-list">
        {items.map((item) => (
          <li key={item.id} className="day-history__detail-row">
            <span>
              {item.libelle}
              {showCategorie && item.categorie ? ` (${getCategoryLabel(item.categorie, customCategories)})` : ""}
            </span>
            <span>{formatMontant(item.montant)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
