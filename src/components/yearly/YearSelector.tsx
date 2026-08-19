import { Card } from "@/components/ui/Card";
import { formatYearLabel } from "@/utils/date";
import "./YearSelector.css";

interface YearSelectorProps {
  startIso: string;
  onPrevYear: () => void;
  onNextYear: () => void;
  onPickYear: (yearStartIso: string) => void;
}

/** Selection de l'annee affichee : navigation precedent/suivant + saisie directe de l'annee. */
export function YearSelector({ startIso, onPrevYear, onNextYear, onPickYear }: YearSelectorProps) {
  return (
    <Card className="year-selector">
      <div className="year-selector__nav">
        <button type="button" className="year-selector__arrow" onClick={onPrevYear} aria-label="Annee precedente">
          ‹
        </button>
        <span className="year-selector__label">📅 {formatYearLabel(startIso)}</span>
        <button type="button" className="year-selector__arrow" onClick={onNextYear} aria-label="Annee suivante">
          ›
        </button>
      </div>
      <label className="year-selector__picker-label" htmlFor="year-picker">
        Annee selectionnee
      </label>
      <input
        id="year-picker"
        type="number"
        inputMode="numeric"
        min={2000}
        max={2100}
        step={1}
        className="year-selector__picker-input"
        value={formatYearLabel(startIso)}
        onChange={(event) => {
          const year = Number(event.target.value);
          if (Number.isInteger(year) && year >= 2000 && year <= 2100) onPickYear(`${year}-01-01`);
        }}
      />
    </Card>
  );
}
