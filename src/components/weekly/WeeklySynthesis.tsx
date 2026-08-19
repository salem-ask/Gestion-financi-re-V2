import { Card } from "@/components/ui/Card";
import { formatMontant } from "@/utils/format";
import type { DayTotals } from "@/types";
import "./WeeklySynthesis.css";

interface WeeklySynthesisProps {
  totals: DayTotals;
}

/**
 * Synthese hebdomadaire : Achats/Ventes/Depenses/Gain/Reste. Contrairement
 * a FinancialSummary (page Quotidien, qui n'affiche que Gain/Reste car les
 * depenses y sont deja visibles dans leur propre editeur), la semaine n'a
 * pas d'editeur de lignes : les 5 valeurs doivent donc apparaitre ici.
 */
export function WeeklySynthesis({ totals }: WeeklySynthesisProps) {
  return (
    <Card className="weekly-synthesis">
      <p className="weekly-synthesis__title">Synthese hebdomadaire</p>
      <div className="weekly-synthesis__grid">
        <Item label="Achats" value={totals.achat} />
        <Item label="Ventes" value={totals.vente} />
        <Item label="Depenses" value={totals.depense} />
        <Item label="Gain" value={totals.gain} />
        <Item label="Reste" value={totals.reste} highlight />
      </div>
    </Card>
  );
}

function Item({ label, value, highlight = false }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div className={`weekly-synthesis__item ${highlight ? "weekly-synthesis__item--highlight" : ""}`}>
      <span className="weekly-synthesis__label">{label}</span>
      <span className="weekly-synthesis__value">{formatMontant(value)}</span>
    </div>
  );
}
