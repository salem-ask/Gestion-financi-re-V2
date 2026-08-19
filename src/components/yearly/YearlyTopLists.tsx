import { formatMontant } from "@/utils/format";
import type { OperationTotal } from "@/services/finance";
import "./YearlyTopLists.css";

interface YearlyTopListsProps {
  topVentes: OperationTotal[];
  topAchats: OperationTotal[];
  topDepenses: OperationTotal[];
}

export function YearlyTopLists({ topVentes, topAchats, topDepenses }: YearlyTopListsProps) {
  return (
    <div className="yearly-top">
      <TopList title="🏆 Top 5 ventes" items={topVentes} />
      <TopList title="🏆 Top 5 achats" items={topAchats} />
      <TopList title="🏆 Top 5 depenses" items={topDepenses} />
    </div>
  );
}

function TopList({ title, items }: { title: string; items: OperationTotal[] }) {
  return (
    <div className="yearly-top__group">
      <p className="yearly-top__group-title">{title}</p>
      {items.length === 0 ? (
        <p className="yearly-top__empty">Aucune donnee.</p>
      ) : (
        <ol className="yearly-top__list">
          {items.map((item) => (
            <li key={item.libelle} className="yearly-top__row">
              <span className="yearly-top__libelle">{item.libelle}</span>
              <span className="yearly-top__montant">{formatMontant(item.montant)}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
