import { AffectationsBlocks } from "@/components/finance/AffectationsSummary";
import { MonthlySynthesis } from "./MonthlySynthesis";
import { MonthlyTopLists } from "./MonthlyTopLists";
import { MonthlyStatisticsSection } from "./MonthlyStatisticsSection";
import { MonthlyDiagnosticSection } from "./MonthlyDiagnosticSection";
import { MonthlyDetailsSection } from "./MonthlyDetailsSection";
import type { MonthlyReportData } from "@/services/reports/monthlyReport";
import "./MonthlyReportPreview.css";

interface MonthlyReportPreviewProps {
  report: MonthlyReportData;
  onClose: () => void;
}

/**
 * Apercu en lecture seule du rapport mensuel. Consomme exactement le meme
 * objet MonthlyReportData que l'export PDF (voir services/reports) : les
 * deux affichent donc toujours les memes donnees, par construction.
 */
export function MonthlyReportPreview({ report, onClose }: MonthlyReportPreviewProps) {
  return (
    <div className="monthly-preview__overlay" role="dialog" aria-modal="true" aria-label="Apercu du rapport mensuel">
      <div className="monthly-preview__panel">
        <div className="monthly-preview__header">
          <h2 className="monthly-preview__title">👁 Apercu du rapport</h2>
          <button type="button" className="monthly-preview__close" onClick={onClose} aria-label="Fermer l'apercu">
            &times;
          </button>
        </div>

        <div className="monthly-preview__body">
          <p className="monthly-preview__period">{report.periodeLabel}</p>

          <MonthlySynthesis totals={report.totals} />

          <section className="monthly-preview__section">
            <p className="monthly-preview__section-title">💼 Affectations financieres</p>
            <AffectationsBlocks affectations={report.totals.affectations} />
          </section>

          <section className="monthly-preview__section">
            <p className="monthly-preview__section-title">🏆 Top 5</p>
            <MonthlyTopLists
              topVentes={report.topVentes}
              topAchats={report.topAchats}
              topDepenses={report.topDepenses}
            />
          </section>

          <section className="monthly-preview__section">
            <p className="monthly-preview__section-title">📊 Statistiques mensuelles</p>
            <MonthlyStatisticsSection statistics={report.statistics} />
          </section>

          <section className="monthly-preview__section">
            <p className="monthly-preview__section-title">🔎 Diagnostic &amp; Prevision</p>
            <MonthlyDiagnosticSection diagnostic={report.diagnostic} />
          </section>

          <section className="monthly-preview__section">
            <p className="monthly-preview__section-title">📋 Details</p>
            <MonthlyDetailsSection
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
