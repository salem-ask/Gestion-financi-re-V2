import { AffectationsBlocks } from "@/components/finance/AffectationsSummary";
import { WeeklySynthesis } from "./WeeklySynthesis";
import { WeeklyTopLists } from "./WeeklyTopLists";
import { WeeklyStatisticsSection } from "./WeeklyStatisticsSection";
import { WeeklyDiagnosticSection } from "./WeeklyDiagnosticSection";
import { WeeklyDetailsSection } from "./WeeklyDetailsSection";
import type { WeeklyReportData } from "@/services/reports/weeklyReport";
import "./WeeklyReportPreview.css";

interface WeeklyReportPreviewProps {
  report: WeeklyReportData;
  onClose: () => void;
}

/**
 * Apercu en lecture seule du rapport hebdomadaire. Consomme exactement le
 * meme objet WeeklyReportData que l'export PDF (voir services/reports) :
 * les deux affichent donc toujours les memes donnees, par construction.
 */
export function WeeklyReportPreview({ report, onClose }: WeeklyReportPreviewProps) {
  return (
    <div className="weekly-preview__overlay" role="dialog" aria-modal="true" aria-label="Apercu du rapport hebdomadaire">
      <div className="weekly-preview__panel">
        <div className="weekly-preview__header">
          <h2 className="weekly-preview__title">👁 Apercu du rapport</h2>
          <button type="button" className="weekly-preview__close" onClick={onClose} aria-label="Fermer l'apercu">
            &times;
          </button>
        </div>

        <div className="weekly-preview__body">
          <p className="weekly-preview__period">{report.periodeLabel}</p>

          <WeeklySynthesis totals={report.totals} />

          <section className="weekly-preview__section">
            <p className="weekly-preview__section-title">💼 Affectations financieres</p>
            <AffectationsBlocks affectations={report.totals.affectations} />
          </section>

          <section className="weekly-preview__section">
            <p className="weekly-preview__section-title">🏆 Top 5</p>
            <WeeklyTopLists
              topVentes={report.topVentes}
              topAchats={report.topAchats}
              topDepenses={report.topDepenses}
            />
          </section>

          <section className="weekly-preview__section">
            <p className="weekly-preview__section-title">📊 Statistiques hebdomadaires</p>
            <WeeklyStatisticsSection statistics={report.statistics} />
          </section>

          <section className="weekly-preview__section">
            <p className="weekly-preview__section-title">🔎 Diagnostic &amp; Prevision</p>
            <WeeklyDiagnosticSection diagnostic={report.diagnostic} />
          </section>

          <section className="weekly-preview__section">
            <p className="weekly-preview__section-title">📋 Details</p>
            <WeeklyDetailsSection
              detailVentes={report.detailVentes}
              detailAchats={report.detailAchats}
              detailDepenses={report.detailDepenses}
            />
          </section>
        </div>
      </div>
    </div>
  );
}
