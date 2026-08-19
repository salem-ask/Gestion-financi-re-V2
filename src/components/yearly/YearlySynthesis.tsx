import { Card } from "@/components/ui/Card";
import { formatMontant } from "@/utils/format";
import type { DayTotals } from "@/types";
import "./YearlySynthesis.css";

interface YearlySynthesisProps {
  totals: DayTotals;
}

/** Synthese annuelle : Achats/Ventes/Depenses/Gain/Reste. Meme principe que MonthlySynthesis, adapte a l'annee. */
export function YearlySynthesis({ totals }: YearlySynthesisProps) {
  return (
    <Card className="yearly-synthesis">
      <p className="yearly-synthesis__title">📊 Synthese annuelle</p>
      <div className="yearly-synthesis__grid">
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
    <div className={`yearly-synthesis__item ${highlight ? "yearly-synthesis__item--highlight" : ""}`}>
      <span className="yearly-synthesis__label">{label}</span>
      <span className="yearly-synthesis__value">{formatMontant(value)}</span>
    </div>
  );
}
