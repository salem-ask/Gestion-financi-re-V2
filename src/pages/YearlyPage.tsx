import { useCallback, useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { CollapsibleSection } from "@/components/ui/CollapsibleSection";
import { AffectationsBlocks } from "@/components/finance/AffectationsSummary";
import { YearSelector } from "@/components/yearly/YearSelector";
import { YearlySynthesis } from "@/components/yearly/YearlySynthesis";
import { YearlyStatisticsSection } from "@/components/yearly/YearlyStatisticsSection";
import { YearlyTopLists } from "@/components/yearly/YearlyTopLists";
import { YearlyDiagnosticSection } from "@/components/yearly/YearlyDiagnosticSection";
import { YearlyDetailsSection } from "@/components/yearly/YearlyDetailsSection";
import { YearlyMonthsSummary } from "@/components/yearly/YearlyMonthsSummary";
import { YearlyBestMonths } from "@/components/yearly/YearlyBestMonths";
import { YearlyReportPreview } from "@/components/yearly/YearlyReportPreview";
import { YearClosureModal } from "@/components/yearly/YearClosureModal";
import { buildYearlyReport } from "@/services/reports/yearlyReport";
import type { YearlyReportData } from "@/services/reports/yearlyReport";
import { downloadYearlyPdf } from "@/services/reports/yearlyPdf";
import { storageService } from "@/services/storage";
import { parseMontant, isValidMontant } from "@/utils/amount";
import { todayIso, startOfYearIso, endOfYearIso, addYearsIso } from "@/utils/date";
import "./YearlyPage.css";

/**
 * Module Annuel : prolongement direct du module Mensuel deja valide (lui
 * meme base sur l'Hebdomadaire), avec exactement les memes principes
 * adaptes a la periode annuelle. Reutilise directement les memes services
 * de calcul (aggregatePeriodTotals, groupOperations, computeWeeklyStatistics,
 * calculateFinancials) et le meme mecanisme de sections repliables
 * (CollapsibleSection) et d'affectations (AffectationsBlocks). Seuls
 * ajouts reellement nouveaux : le resume des 12 mois et les meilleurs
 * mois (services/finance/yearlyMonthsSummary.ts), propres a la periode
 * annuelle.
 */
export function YearlyPage() {
  const [anchorDate, setAnchorDate] = useState(todayIso());
  const [report, setReport] = useState<YearlyReportData | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [objectifRaw, setObjectifRaw] = useState("");
  const [closed, setClosed] = useState(false);
  const [closureModalOpen, setClosureModalOpen] = useState(false);

  const startIso = useMemo(() => startOfYearIso(anchorDate), [anchorDate]);
  const endIso = useMemo(() => endOfYearIso(anchorDate), [anchorDate]);

  const refresh = useCallback(async () => {
    const [data, closedState] = await Promise.all([
      buildYearlyReport(startIso, endIso),
      storageService.getYearClosure(startIso),
    ]);
    setReport(data);
    setObjectifRaw(data.diagnostic.objectifVente > 0 ? String(data.diagnostic.objectifVente) : "");
    setClosed(closedState);
  }, [startIso, endIso]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function handleToggleClosure() {
    await storageService.setYearClosure(startIso, !closed);
    setClosed(!closed);
    setClosureModalOpen(false);
  }

  async function commitObjectifVente() {
    const parsed = parseMontant(objectifRaw);
    const value = isValidMontant(parsed) ? parsed : 0;
    await storageService.saveYearlySalesGoal(value);
    await refresh();
  }

  function goPrevYear() {
    setAnchorDate((prev) => addYearsIso(prev, -1));
  }

  function goNextYear() {
    setAnchorDate((prev) => addYearsIso(prev, 1));
  }

  async function handleExportPdf() {
    if (report) await downloadYearlyPdf(report);
  }

  return (
    <div className="yearly-page">
      <YearSelector startIso={startIso} onPrevYear={goPrevYear} onNextYear={goNextYear} onPickYear={setAnchorDate} />

      <div className="yearly-page__closure">
        {closed && <p className="yearly-page__closure-badge">🔒 Annee cloturee</p>}
        <Button type="button" variant="secondary" onClick={() => setClosureModalOpen(true)}>
          {closed ? "🔓 Rouvrir l'annee" : "🔒 Cloturer l'annee"}
        </Button>
      </div>

      {!report ? (
        <p className="yearly-page__loading">Chargement...</p>
      ) : (
        <>
          {report.statistics.joursEnregistres === 0 && (
            <p className="yearly-page__empty">Aucune donnee enregistree pour cette annee.</p>
          )}

          <YearlySynthesis totals={report.totals} />

          <Card className="yearly-page__section">
            <CollapsibleSection title="Affectations financieres" icon="💼" panelId="yearly-affectations-panel">
              <AffectationsBlocks affectations={report.totals.affectations} />
            </CollapsibleSection>
          </Card>

          <Card className="yearly-page__section">
            <CollapsibleSection title="Top 5" icon="🏆" panelId="yearly-top5-panel">
              <YearlyTopLists topVentes={report.topVentes} topAchats={report.topAchats} topDepenses={report.topDepenses} />
            </CollapsibleSection>
          </Card>

          <Card className="yearly-page__section">
            <CollapsibleSection title="Statistiques annuelles" icon="📊" panelId="yearly-statistics-panel">
              <YearlyStatisticsSection statistics={report.statistics} />
            </CollapsibleSection>
          </Card>

          <Card className="yearly-page__section">
            <CollapsibleSection title="Resume des 12 mois" icon="📅" panelId="yearly-months-panel" defaultOpen={false}>
              <YearlyMonthsSummary monthsSummary={report.monthsSummary} />
            </CollapsibleSection>
          </Card>

          <Card className="yearly-page__section">
            <CollapsibleSection title="Meilleurs mois" icon="🏆" panelId="yearly-best-months-panel">
              <YearlyBestMonths bestMonths={report.bestMonths} />
            </CollapsibleSection>
          </Card>

          <Card className="yearly-page__section">
            <CollapsibleSection title="Diagnostic & Prevision" icon="🔎" panelId="yearly-diagnostic-panel">
              <YearlyDiagnosticSection
                diagnostic={report.diagnostic}
                editable
                objectifRaw={objectifRaw}
                onObjectifChange={setObjectifRaw}
                onObjectifCommit={commitObjectifVente}
              />
            </CollapsibleSection>
          </Card>

          <Card className="yearly-page__section">
            <CollapsibleSection title="Details" icon="📋" panelId="yearly-details-panel" defaultOpen={false}>
              <YearlyDetailsSection
                detailVentes={report.detailVentes}
                detailAchats={report.detailAchats}
                detailDepenses={report.detailDepenses}
              />
            </CollapsibleSection>
          </Card>

          <div className="yearly-page__actions">
            <Button type="button" variant="secondary" onClick={() => setPreviewOpen(true)}>
              👁 Apercu du rapport
            </Button>
            <Button type="button" onClick={handleExportPdf}>
              📄 Export PDF annuel
            </Button>
          </div>
        </>
      )}

      {previewOpen && report && <YearlyReportPreview report={report} onClose={() => setPreviewOpen(false)} />}

      {closureModalOpen && report && (
        <YearClosureModal
          mode={closed ? "reopen" : "close"}
          periodeLabel={report.periodeLabel}
          onCancel={() => setClosureModalOpen(false)}
          onConfirm={handleToggleClosure}
        />
      )}
    </div>
  );
}
