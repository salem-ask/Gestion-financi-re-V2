import { Card } from "@/components/ui/Card";
import { formatDateRangeFr } from "@/utils/date";
import "./WeekSelector.css";

interface WeekSelectorProps {
  startIso: string;
  endIso: string;
  onPrevWeek: () => void;
  onNextWeek: () => void;
  onPickDate: (dateIso: string) => void;
}

/** Selection de la semaine affichee : navigation precedent/suivant + choix direct d'une date dans la semaine. */
export function WeekSelector({ startIso, endIso, onPrevWeek, onNextWeek, onPickDate }: WeekSelectorProps) {
  return (
    <Card className="week-selector">
      <div className="week-selector__nav">
        <button type="button" className="week-selector__arrow" onClick={onPrevWeek} aria-label="Semaine precedente">
          ‹
        </button>
        <span className="week-selector__label">{formatDateRangeFr(startIso, endIso)}</span>
        <button type="button" className="week-selector__arrow" onClick={onNextWeek} aria-label="Semaine suivante">
          ›
        </button>
      </div>
      <label className="week-selector__date-label" htmlFor="week-date-picker">
        Choisir une date dans la semaine
      </label>
      <input
        id="week-date-picker"
        type="date"
        className="week-selector__date-input"
        value={startIso}
        onChange={(event) => event.target.value && onPickDate(event.target.value)}
      />
    </Card>
  );
}
