import { formatMontant } from "@/utils/format";
import type { OperationTotal } from "@/services/finance";
import "./WeeklyTopLists.css";

interface WeeklyTopListsProps {
  topVentes: OperationTotal[];
  topAchats: OperationTotal[];
  topDepenses: OperationTotal[];
}

export function WeeklyTopLists({ topVentes, topAchats, topDepenses }: WeeklyTopListsProps) {
  return (
    <div className="weekly-top">
      <TopList title="🏆 Top 5 ventes" items={topVentes} />
      <TopList title="🏆 Top 5 achats" items={topAchats} />
      <TopList title="🏆 Top 5 depenses" items={topDepenses} />
    </div>
  );
}

function TopList({ title, items }: { title: string; items: OperationTotal[] }) {
  return (
    <div className="weekly-top__group">
      <p className="weekly-top__group-title">{title}</p>
      {items.length === 0 ? (
        <p className="weekly-top__empty">Aucune donnee.</p>
      ) : (
        <ol className="weekly-top__list">
          {items.map((item) => (
            <li key={item.libelle} className="weekly-top__row">
              <span className="weekly-top__libelle">{item.libelle}</span>
              <span className="weekly-top__montant">{formatMontant(item.montant)}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
