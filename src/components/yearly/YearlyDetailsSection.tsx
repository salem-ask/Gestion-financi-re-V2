import { formatMontant } from "@/utils/format";
import type { OperationTotal } from "@/services/finance";
import "./YearlyDetailsSection.css";

interface YearlyDetailsSectionProps {
  detailVentes: OperationTotal[];
  detailAchats: OperationTotal[];
  detailDepenses: OperationTotal[];
}

export function YearlyDetailsSection({ detailVentes, detailAchats, detailDepenses }: YearlyDetailsSectionProps) {
  return (
    <div className="yearly-details">
      <DetailGroup title="Ventes par libelle" items={detailVentes} />
      <DetailGroup title="Achats par libelle" items={detailAchats} />
      <DetailGroup title="Depenses par libelle" items={detailDepenses} />
    </div>
  );
}

function DetailGroup({ title, items }: { title: string; items: OperationTotal[] }) {
  return (
    <div className="yearly-details__group">
      <p className="yearly-details__group-title">{title}</p>
      {items.length === 0 ? (
        <p className="yearly-details__empty">Aucune ligne.</p>
      ) : (
        <ul className="yearly-details__list">
          {items.map((item) => (
            <li key={item.libelle} className="yearly-details__row">
              <span className="yearly-details__libelle">{item.libelle}</span>
              <span className="yearly-details__montant">{formatMontant(item.montant)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
