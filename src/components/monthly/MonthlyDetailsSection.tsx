import { formatMontant } from "@/utils/format";
import type { OperationTotal } from "@/services/finance";
import "./MonthlyDetailsSection.css";

interface MonthlyDetailsSectionProps {
  detailVentes: OperationTotal[];
  detailAchats: OperationTotal[];
  detailDepenses: OperationTotal[];
}

export function MonthlyDetailsSection({ detailVentes, detailAchats, detailDepenses }: MonthlyDetailsSectionProps) {
  return (
    <div className="monthly-details">
      <DetailGroup title="Ventes par libelle" items={detailVentes} />
      <DetailGroup title="Achats par libelle" items={detailAchats} />
      <DetailGroup title="Depenses par libelle" items={detailDepenses} />
    </div>
  );
}

function DetailGroup({ title, items }: { title: string; items: OperationTotal[] }) {
  return (
    <div className="monthly-details__group">
      <p className="monthly-details__group-title">{title}</p>
      {items.length === 0 ? (
        <p className="monthly-details__empty">Aucune ligne.</p>
      ) : (
        <ul className="monthly-details__list">
          {items.map((item) => (
            <li key={item.libelle} className="monthly-details__row">
              <span className="monthly-details__libelle">{item.libelle}</span>
              <span className="monthly-details__montant">{formatMontant(item.montant)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
