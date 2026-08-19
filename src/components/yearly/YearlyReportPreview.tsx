import { AffectationsBlocks } from "@/components/finance/AffectationsSummary";
import { YearlySynthesis } from "./YearlySynthesis";
import { YearlyTopLists } from "./YearlyTopLists";
import { YearlyStatisticsSection } from "./YearlyStatisticsSection";
import { YearlyDiagnosticSection } from "./YearlyDiagnosticSection";
import { YearlyDetailsSection } from "./YearlyDetailsSection";
import { YearlyMonthsSummary } from "./YearlyMonthsSummary";
import { YearlyBestMonths } from "./YearlyBestMonths";
import type { YearlyReportData } from "@/services/reports/yearlyReport";
import "./YearlyReportPreview.css";

interface YearlyReportPreviewProps {
  report: YearlyReportData;
  onClose: () => void;
}

/**
 * Apercu en lecture seule du rapport annuel. Consomme exactement le meme
 * objet YearlyReportData que l'export PDF (voir services/reports) : les
 * deux affichent donc toujours les memes donnees.
 */
export function YearlyReportPreview({ report, onClose }: YearlyReportPreviewProps) {
  return (
    <div className="yearly-preview__overlay" role="dialog" aria-modal="true" aria-label="Apercu du rapport annuel">
      <div className="yearly-preview__panel">
        <div className="yearly-preview__header">
          <h2 className="yearly-preview__title">👁 Apercu du rapport</h2>
          <button type="button" className="yearly-preview__close" onClick={onClose} aria-label="Fermer l'apercu">
            &times;
          </button>
        </div>

        <div className="yearly-preview__body">
          <p className="yearly-preview__period">{report.periodeLabel}</p>

          <YearlySynthesis totals={report.totals} />

          <section className="yearly-preview__section">
            <p className="yearly-preview__section-title">💼 Affectations financieres</p>
            <AffectationsBlocks affectations={report.totals.affectations} />
          </section>

          <section className="yearly-preview__section">
            <p className="yearly-preview__section-title">🏆 Top 5</p>
            <YearlyTopLists topVentes={report.topVentes} topAchats={report.topAchats} topDepenses={report.topDepenses} />
          </section>

          <section className="yearly-preview__section">
            <p className="yearly-preview__section-title">📊 Statistiques annuelles</p>
            <YearlyStatisticsSection statistics={report.statistics} />
          </section>

          <section className="yearly-preview__section">
            <p className="yearly-preview__section-title">📅 Resume des 12 mois</p>
            <YearlyMonthsSummary monthsSummary={report.monthsSummary} />
          </section>

          <section className="yearly-preview__section">
            <p className="yearly-preview__section-title">🏆 Meilleurs mois</p>
            <YearlyBestMonths bestMonths={report.bestMonths} />
          </section>

          <section className="yearly-preview__section">
            <p className="yearly-preview__section-title">🔎 Diagnostic &amp; Prevision</p>
            <YearlyDiagnosticSection diagnostic={report.diagnostic} />
          </section>

          <section className="yearly-preview__section">
            <p className="yearly-preview__section-title">📋 Details</p>
            <YearlyDetailsSection
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
