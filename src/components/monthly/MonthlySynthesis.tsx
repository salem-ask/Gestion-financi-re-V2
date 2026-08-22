import { Card } from "@/components/ui/Card";
import { formatMontant } from "@/utils/format";
import type { DayTotals } from "@/types";
import "./MonthlySynthesis.css";

interface MonthlySynthesisProps {
  totals: DayTotals;
}

/** Synthese mensuelle : Achats/Ventes/Depenses/Gain/Reste. Meme principe que WeeklySynthesis, adapte au mois. */
export function MonthlySynthesis({ totals }: MonthlySynthesisProps) {
  return (
    <Card className="monthly-synthesis">
      <p className="monthly-synthesis__title">📊 Synthese mensuelle</p>
      <div className="monthly-synthesis__grid">
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
    <div className={`monthly-synthesis__item ${highlight ? "monthly-synthesis__item--highlight" : ""}`}>
      <span className="monthly-synthesis__label">{label}</span>
      <span className="monthly-synthesis__value">{formatMontant(value)}</span>
    </div>
  );
}
