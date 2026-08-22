import { useCallback, useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { CollapsibleSection } from "@/components/ui/CollapsibleSection";
import { AffectationsBlocks } from "@/components/finance/AffectationsSummary";
import { MonthSelector } from "@/components/monthly/MonthSelector";
import { MonthlySynthesis } from "@/components/monthly/MonthlySynthesis";
import { MonthlyStatisticsSection } from "@/components/monthly/MonthlyStatisticsSection";
import { MonthlyTopLists } from "@/components/monthly/MonthlyTopLists";
import { MonthlyDiagnosticSection } from "@/components/monthly/MonthlyDiagnosticSection";
import { MonthlyDetailsSection } from "@/components/monthly/MonthlyDetailsSection";
import { MonthlyReportPreview } from "@/components/monthly/MonthlyReportPreview";
import { MonthClosureModal } from "@/components/monthly/MonthClosureModal";
import { buildMonthlyReport } from "@/services/reports/monthlyReport";
import type { MonthlyReportData } from "@/services/reports/monthlyReport";
import { downloadMonthlyPdf } from "@/services/reports/monthlyPdf";
import { storageService } from "@/services/storage";
import { parseMontant, isValidMontant } from "@/utils/amount";
import { todayIso, startOfMonthIso, endOfMonthIso, addMonthsIso } from "@/utils/date";
import "./MonthlyPage.css";

/**
 * Module Mensuel : prolongement direct du module Hebdomadaire deja valide
 * (voir pages/WeeklyPage.tsx), avec exactement les memes principes
 * adaptes a la periode mensuelle. Reutilise directement les memes services
 * de calcul (aggregatePeriodTotals, groupOperations, computeWeeklyStatistics,
 * calculateFinancials) et le meme mecanisme de sections repliables
 * (CollapsibleSection) et d'affectations (AffectationsBlocks).
 */
export function MonthlyPage() {
  const [anchorDate, setAnchorDate] = useState(todayIso());
  const [report, setReport] = useState<MonthlyReportData | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [objectifRaw, setObjectifRaw] = useState("");
  const [closed, setClosed] = useState(false);
  const [closureModalOpen, setClosureModalOpen] = useState(false);

  const startIso = useMemo(() => startOfMonthIso(anchorDate), [anchorDate]);
  const endIso = useMemo(() => endOfMonthIso(anchorDate), [anchorDate]);

  const refresh = useCallback(async () => {
    const [data, closedState] = await Promise.all([
      buildMonthlyReport(startIso, endIso),
      storageService.getMonthClosure(startIso),
    ]);
    setReport(data);
    setObjectifRaw(data.diagnostic.objectifVente > 0 ? String(data.diagnostic.objectifVente) : "");
    setClosed(closedState);
  }, [startIso, endIso]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function handleToggleClosure() {
    await storageService.setMonthClosure(startIso, !closed);
    setClosed(!closed);
    setClosureModalOpen(false);
  }

  async function commitObjectifVente() {
    const parsed = parseMontant(objectifRaw);
    const value = isValidMontant(parsed) ? parsed : 0;
    await storageService.saveMonthlySalesGoal(value);
    await refresh();
  }

  function goPrevMonth() {
    setAnchorDate((prev) => addMonthsIso(prev, -1));
  }

  function goNextMonth() {
    setAnchorDate((prev) => addMonthsIso(prev, 1));
  }

  async function handleExportPdf() {
    if (report) await downloadMonthlyPdf(report);
  }

  return (
    <div className="monthly-page">
      <MonthSelector startIso={startIso} onPrevMonth={goPrevMonth} onNextMonth={goNextMonth} onPickMonth={setAnchorDate} />

      <div className="monthly-page__closure">
        {closed && <p className="monthly-page__closure-badge">🔒 Mois cloture</p>}
        <Button type="button" variant="secondary" onClick={() => setClosureModalOpen(true)}>
          {closed ? "🔓 Rouvrir le mois" : "🔒 Cloturer le mois"}
        </Button>
      </div>

      {!report ? (
        <p className="monthly-page__loading">Chargement...</p>
      ) : (
        <>
          {report.statistics.joursEnregistres === 0 && (
            <p className="monthly-page__empty">Aucune donnee enregistree pour ce mois.</p>
          )}

          <MonthlySynthesis totals={report.totals} />

          <Card className="monthly-page__section">
            <CollapsibleSection title="Affectations financieres" icon="💼" panelId="monthly-affectations-panel">
              <AffectationsBlocks affectations={report.totals.affectations} />
            </CollapsibleSection>
          </Card>

          <Card className="monthly-page__section">
            <CollapsibleSection title="Top 5" icon="🏆" panelId="monthly-top5-panel">
              <MonthlyTopLists
                topVentes={report.topVentes}
                topAchats={report.topAchats}
                topDepenses={report.topDepenses}
              />
            </CollapsibleSection>
          </Card>

          <Card className="monthly-page__section">
            <CollapsibleSection title="Statistiques mensuelles" icon="📊" panelId="monthly-statistics-panel">
              <MonthlyStatisticsSection statistics={report.statistics} />
            </CollapsibleSection>
          </Card>

          <Card className="monthly-page__section">
            <CollapsibleSection title="Diagnostic & Prevision" icon="🔎" panelId="monthly-diagnostic-panel">
              <MonthlyDiagnosticSection
                diagnostic={report.diagnostic}
                editable
                objectifRaw={objectifRaw}
                onObjectifChange={setObjectifRaw}
                onObjectifCommit={commitObjectifVente}
              />
            </CollapsibleSection>
          </Card>

          <Card className="monthly-page__section">
            <CollapsibleSection title="Details" icon="📋" panelId="monthly-details-panel">
              <MonthlyDetailsSection
                detailVentes={report.detailVentes}
                detailAchats={report.detailAchats}
                detailDepenses={report.detailDepenses}
              />
            </CollapsibleSection>
          </Card>

          <div className="monthly-page__actions">
            <Button type="button" variant="secondary" onClick={() => setPreviewOpen(true)}>
              👁 Apercu du rapport
            </Button>
            <Button type="button" onClick={handleExportPdf}>
              📄 Export PDF mensuel
            </Button>
          </div>
        </>
      )}

      {previewOpen && report && <MonthlyReportPreview report={report} onClose={() => setPreviewOpen(false)} />}

      {closureModalOpen && report && (
        <MonthClosureModal
          mode={closed ? "reopen" : "close"}
          periodeLabel={report.periodeLabel}
          onCancel={() => setClosureModalOpen(false)}
          onConfirm={handleToggleClosure}
        />
      )}
    </div>
  );
}
