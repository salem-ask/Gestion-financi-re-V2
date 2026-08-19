import { formatMontant } from "@/utils/format";
import type { OperationTotal } from "@/services/finance";
import "./WeeklyDetailsSection.css";

interface WeeklyDetailsSectionProps {
  detailVentes: OperationTotal[];
  detailAchats: OperationTotal[];
  detailDepenses: OperationTotal[];
}

export function WeeklyDetailsSection({ detailVentes, detailAchats, detailDepenses }: WeeklyDetailsSectionProps) {
  return (
    <div className="weekly-details">
      <DetailGroup title="Ventes par libelle" items={detailVentes} />
      <DetailGroup title="Achats par libelle" items={detailAchats} />
      <DetailGroup title="Depenses par libelle" items={detailDepenses} />
    </div>
  );
}

function DetailGroup({ title, items }: { title: string; items: OperationTotal[] }) {
  return (
    <div className="weekly-details__group">
      <p className="weekly-details__group-title">{title}</p>
      {items.length === 0 ? (
        <p className="weekly-details__empty">Aucune ligne.</p>
      ) : (
        <ul className="weekly-details__list">
          {items.map((item) => (
            <li key={item.libelle} className="weekly-details__row">
              <span className="weekly-details__libelle">{item.libelle}</span>
              <span className="weekly-details__montant">{formatMontant(item.montant)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
