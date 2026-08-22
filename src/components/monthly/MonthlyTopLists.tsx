import { formatMontant } from "@/utils/format";
import type { OperationTotal } from "@/services/finance";
import "./MonthlyTopLists.css";

interface MonthlyTopListsProps {
  topVentes: OperationTotal[];
  topAchats: OperationTotal[];
  topDepenses: OperationTotal[];
}

export function MonthlyTopLists({ topVentes, topAchats, topDepenses }: MonthlyTopListsProps) {
  return (
    <div className="monthly-top">
      <TopList title="🏆 Top 5 ventes" items={topVentes} />
      <TopList title="🏆 Top 5 achats" items={topAchats} />
      <TopList title="🏆 Top 5 depenses" items={topDepenses} />
    </div>
  );
}

function TopList({ title, items }: { title: string; items: OperationTotal[] }) {
  return (
    <div className="monthly-top__group">
      <p className="monthly-top__group-title">{title}</p>
      {items.length === 0 ? (
        <p className="monthly-top__empty">Aucune donnee.</p>
      ) : (
        <ol className="monthly-top__list">
          {items.map((item) => (
            <li key={item.libelle} className="monthly-top__row">
              <span className="monthly-top__libelle">{item.libelle}</span>
              <span className="monthly-top__montant">{formatMontant(item.montant)}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
