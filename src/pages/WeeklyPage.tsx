import { useCallback, useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { CollapsibleSection } from "@/components/ui/CollapsibleSection";
import { AffectationsBlocks } from "@/components/finance/AffectationsSummary";
import { WeekSelector } from "@/components/weekly/WeekSelector";
import { WeeklySynthesis } from "@/components/weekly/WeeklySynthesis";
import { WeeklyStatisticsSection } from "@/components/weekly/WeeklyStatisticsSection";
import { WeeklyTopLists } from "@/components/weekly/WeeklyTopLists";
import { WeeklyDiagnosticSection } from "@/components/weekly/WeeklyDiagnosticSection";
import { WeeklyDetailsSection } from "@/components/weekly/WeeklyDetailsSection";
import { WeeklyReportPreview } from "@/components/weekly/WeeklyReportPreview";
import { WeekClosureModal } from "@/components/weekly/WeekClosureModal";
import { buildWeeklyReport } from "@/services/reports/weeklyReport";
import type { WeeklyReportData } from "@/services/reports/weeklyReport";
import { downloadWeeklyPdf } from "@/services/reports/weeklyPdf";
import { storageService } from "@/services/storage";
import { parseMontant, isValidMontant } from "@/utils/amount";
import { todayIso, startOfWeekIso, endOfWeekIso, addDaysIso } from "@/utils/date";
import "./WeeklyPage.css";

export function WeeklyPage() {
  const [anchorDate, setAnchorDate] = useState(todayIso());
  const [report, setReport] = useState<WeeklyReportData | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [objectifRaw, setObjectifRaw] = useState("");
  const [closed, setClosed] = useState(false);
  const [closureModalOpen, setClosureModalOpen] = useState(false);

  const startIso = useMemo(() => startOfWeekIso(anchorDate), [anchorDate]);
  const endIso = useMemo(() => endOfWeekIso(anchorDate), [anchorDate]);

  // Ne remonte jamais la section (et ne referme donc jamais les
  // CollapsibleSection deja ouvertes) lors d'un simple rafraichissement
  // des donnees (changement de semaine, saisie de l'objectif de vente) :
  // report reste affiche pendant le chargement, seul le tout premier
  // chargement affiche "Chargement...".
  const refresh = useCallback(async () => {
    const [data, closedState] = await Promise.all([
      buildWeeklyReport(startIso, endIso),
      storageService.getWeekClosure(startIso),
    ]);
    setReport(data);
    setObjectifRaw(data.diagnostic.objectifVente > 0 ? String(data.diagnostic.objectifVente) : "");
    setClosed(closedState);
  }, [startIso, endIso]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function handleToggleClosure() {
    await storageService.setWeekClosure(startIso, !closed);
    setClosed(!closed);
    setClosureModalOpen(false);
  }

  async function commitObjectifVente() {
    const parsed = parseMontant(objectifRaw);
    const value = isValidMontant(parsed) ? parsed : 0;
    await storageService.saveWeeklySalesGoal(value);
    await refresh();
  }

  function goPrevWeek() {
    setAnchorDate((prev) => addDaysIso(prev, -7));
  }

  function goNextWeek() {
    setAnchorDate((prev) => addDaysIso(prev, 7));
  }

  async function handleExportPdf() {
    if (report) await downloadWeeklyPdf(report);
  }

  return (
    <div className="weekly-page">
      <WeekSelector
        startIso={startIso}
        endIso={endIso}
        onPrevWeek={goPrevWeek}
        onNextWeek={goNextWeek}
        onPickDate={setAnchorDate}
      />

      <div className="weekly-page__closure">
        {closed && <p className="weekly-page__closure-badge">🔒 Cloturee</p>}
        <Button type="button" variant="secondary" onClick={() => setClosureModalOpen(true)}>
          {closed ? "🔓 Rouvrir la semaine" : "🔒 Cloturer la semaine"}
        </Button>
      </div>

      {!report ? (
        <p className="weekly-page__loading">Chargement...</p>
      ) : (
        <>
          {report.statistics.joursEnregistres === 0 && (
            <p className="weekly-page__empty">Aucune donnee enregistree pour cette semaine.</p>
          )}

          <WeeklySynthesis totals={report.totals} />

          <Card className="weekly-page__section">
            <CollapsibleSection title="Affectations financieres" icon="💼" panelId="weekly-affectations-panel">
              <AffectationsBlocks affectations={report.totals.affectations} />
            </CollapsibleSection>
          </Card>

          <Card className="weekly-page__section">
            <CollapsibleSection title="Top 5" icon="🏆" panelId="weekly-top5-panel">
              <WeeklyTopLists
                topVentes={report.topVentes}
                topAchats={report.topAchats}
                topDepenses={report.topDepenses}
              />
            </CollapsibleSection>
          </Card>

          <Card className="weekly-page__section">
            <CollapsibleSection title="Statistiques hebdomadaires" icon="📊" panelId="weekly-statistics-panel">
              <WeeklyStatisticsSection statistics={report.statistics} />
            </CollapsibleSection>
          </Card>

          <Card className="weekly-page__section">
            <CollapsibleSection title="Diagnostic & Prevision" icon="🔎" panelId="weekly-diagnostic-panel">
              <WeeklyDiagnosticSection
                diagnostic={report.diagnostic}
                editable
                objectifRaw={objectifRaw}
                onObjectifChange={setObjectifRaw}
                onObjectifCommit={commitObjectifVente}
              />
            </CollapsibleSection>
          </Card>

          <Card className="weekly-page__section">
            <CollapsibleSection title="Details" icon="📋" panelId="weekly-details-panel">
              <WeeklyDetailsSection
                detailVentes={report.detailVentes}
                detailAchats={report.detailAchats}
                detailDepenses={report.detailDepenses}
              />
            </CollapsibleSection>
          </Card>

          <div className="weekly-page__actions">
            <Button type="button" variant="secondary" onClick={() => setPreviewOpen(true)}>
              👁 Apercu du rapport
            </Button>
            <Button type="button" onClick={handleExportPdf}>
              📄 Export PDF hebdomadaire
            </Button>
          </div>
        </>
      )}

      {previewOpen && report && <WeeklyReportPreview report={report} onClose={() => setPreviewOpen(false)} />}

      {closureModalOpen && report && (
        <WeekClosureModal
          mode={closed ? "reopen" : "close"}
          periodeLabel={report.periodeLabel}
          onCancel={() => setClosureModalOpen(false)}
          onConfirm={handleToggleClosure}
        />
      )}
    </div>
  );
}
