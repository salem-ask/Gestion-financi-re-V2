import { Card } from "@/components/ui/Card";
import { formatMonthLabel } from "@/utils/date";
import "./MonthSelector.css";

interface MonthSelectorProps {
  startIso: string;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onPickMonth: (monthStartIso: string) => void;
}

/** Selection du mois affiche : navigation precedent/suivant + selecteur natif mois/annee. */
export function MonthSelector({ startIso, onPrevMonth, onNextMonth, onPickMonth }: MonthSelectorProps) {
  return (
    <Card className="month-selector">
      <div className="month-selector__nav">
        <button type="button" className="month-selector__arrow" onClick={onPrevMonth} aria-label="Mois precedent">
          ‹
        </button>
        <span className="month-selector__label">📅 {formatMonthLabel(startIso)}</span>
        <button type="button" className="month-selector__arrow" onClick={onNextMonth} aria-label="Mois suivant">
          ›
        </button>
      </div>
      <label className="month-selector__picker-label" htmlFor="month-picker">
        Mois selectionne
      </label>
      <input
        id="month-picker"
        type="month"
        className="month-selector__picker-input"
        value={startIso.slice(0, 7)}
        onChange={(event) => event.target.value && onPickMonth(`${event.target.value}-01`)}
      />
    </Card>
  );
}
