import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { CollapsibleSection } from "@/components/ui/CollapsibleSection";
import { OperationLineEditor } from "@/components/finance/OperationLineEditor";
import { FinancialSummary } from "@/components/finance/FinancialSummary";
import { AffectationsInput, type AffectationsRaw } from "@/components/finance/AffectationsInput";
import { AffectationsSummary } from "@/components/finance/AffectationsSummary";
import { DayHistoryList } from "@/components/finance/DayHistoryList";
import { AddCategoryModal } from "@/components/finance/AddCategoryModal";
import { ResetHistoryModal } from "@/components/finance/ResetHistoryModal";
import { CsvConflictModal } from "@/components/finance/CsvConflictModal";
import { createEmptyDraftLine, type DraftLine } from "@/components/finance/types";
import { calculateFinancials, defaultFinancialSettings } from "@/services/finance";
import { storageService } from "@/services/storage";
import { DuplicateDateError } from "@/services/storage/indexedDbStorage";
import { notesService } from "@/services/notesService";
import { downloadDetailedCsv } from "@/services/migration/csvExport";
import { csvMigrationService } from "@/services/migration/csvMigrationService";
import type { CsvImportPreview, CsvConflictResolution } from "@/services/migration/types";
import { parseMontant, isValidMontant } from "@/utils/amount";
import { todayIso, startOfWeekIso, startOfMonthIso, startOfYearIso } from "@/utils/date";
import { mergeCategories, AFFECTATION_KEYS } from "@/types";
import type { DayEntry, Note, OperationItem, CustomDepenseCategory, AffectationsRealisees } from "@/types";
import "./DailyPage.css";

type LineCategory = "achats" | "ventes" | "depenses";

/**
 * Preference d'affichage pure (repli/deploi de l'historique) : memorisee
 * en localStorage, distinct du storageService/IndexedDB qui gere les
 * donnees metier (journees/notes/categories). Volontairement isole ici
 * plutot que dans l'architecture de stockage existante, pour ne pas
 * ajouter un store IndexedDB/une migration de schema pour un simple
 * booleen d'UI. Enveloppe dans un try/catch pour ne jamais faire planter
 * la page si le stockage est indisponible (navigation privee stricte, etc.).
 */
const HISTORY_OPEN_STORAGE_KEY = "daily-history-open";

function readHistoryOpenPreference(): boolean {
  try {
    return localStorage.getItem(HISTORY_OPEN_STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

function writeHistoryOpenPreference(open: boolean): void {
  try {
    localStorage.setItem(HISTORY_OPEN_STORAGE_KEY, String(open));
  } catch {
    // Stockage indisponible : on continue sans memoriser la preference.
  }
}

function linesFromItems(items: OperationItem[]): DraftLine[] {
  return items.map((item) => ({
    id: item.id,
    libelle: item.libelle,
    montantRaw: String(item.montant),
    categorie: item.categorie,
  }));
}

function generateLocalId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Convertit les lignes en cours de saisie vers des OperationItem valides.
 * Une ligne totalement vide (libelle ET montant vides) est ignoree. Une
 * ligne partiellement remplie est une erreur de validation.
 */
function resolveLines(lines: DraftLine[]): { items: OperationItem[]; errors: string[] } {
  const items: OperationItem[] = [];
  const errors: string[] = [];

  for (const line of lines) {
    const libelle = line.libelle.trim();
    const montant = parseMontant(line.montantRaw);
    const isEmpty = libelle === "" && line.montantRaw.trim() === "";
    if (isEmpty) continue;

    if (libelle === "") {
      errors.push("Une ligne a un montant mais pas de libelle.");
      continue;
    }
    if (!isValidMontant(montant)) {
      errors.push(`Montant invalide pour "${libelle}".`);
      continue;
    }

    items.push({ id: line.id, libelle, montant, categorie: line.categorie });
  }

  return { items, errors };
}

function emptyAffectationsRaw(): AffectationsRaw {
  return { dime: "", epargne: "", generosite: "" };
}

function affectationsRawFrom(values: AffectationsRealisees): AffectationsRaw {
  return { dime: String(values.dime), epargne: String(values.epargne), generosite: String(values.generosite) };
}

/**
 * Convertit la saisie brute des affectations en valeurs numeriques. Un
 * champ vide vaut 0 (rien de realise) ; un champ non vide mais invalide
 * est une erreur de validation, exactement comme pour les lignes
 * d'operations.
 */
function resolveAffectations(raw: AffectationsRaw): { values: AffectationsRealisees; errors: string[] } {
  const values = { dime: 0, epargne: 0, generosite: 0 } as AffectationsRealisees;
  const errors: string[] = [];

  for (const key of AFFECTATION_KEYS) {
    const rawValue = raw[key];
    if (rawValue.trim() === "") continue;
    const parsed = parseMontant(rawValue);
    if (!isValidMontant(parsed)) {
      errors.push(`Montant invalide pour l'affectation "${key}".`);
      continue;
    }
    values[key] = parsed;
  }

  return { values, errors };
}

export function DailyPage() {
  const [days, setDays] = useState<DayEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const [editingDayId, setEditingDayId] = useState<string | null>(null);
  const [date, setDate] = useState(todayIso());
  const [lines, setLines] = useState<Record<LineCategory, DraftLine[]>>({
    achats: [],
    ventes: [],
    depenses: [],
  });
  const [affectationsRaw, setAffectationsRaw] = useState<AffectationsRaw>(emptyAffectationsRaw);

  const [dayNotes, setDayNotes] = useState<Note[]>([]);
  const [newNoteText, setNewNoteText] = useState("");

  const [formError, setFormError] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<string | null>(null);
  const [duplicateWarning, setDuplicateWarning] = useState<DayEntry | null>(null);
  const [saving, setSaving] = useState(false);

  const [customCategories, setCustomCategories] = useState<CustomDepenseCategory[]>([]);
  const [addCategoryForLineId, setAddCategoryForLineId] = useState<string | null>(null);
  const depenseCategoryOptions = useMemo(() => mergeCategories(customCategories), [customCategories]);

  const [historyOpen, setHistoryOpen] = useState(readHistoryOpenPreference);

  const [csvMessage, setCsvMessage] = useState<{ type: "success" | "warning" | "error"; text: string } | null>(null);
  const [importingCsv, setImportingCsv] = useState(false);
  const [csvConflictPreview, setCsvConflictPreview] = useState<CsvImportPreview | null>(null);
  const csvFileInputRef = useRef<HTMLInputElement>(null);

  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [resetMessage, setResetMessage] = useState<string | null>(null);

  function toggleHistory() {
    setHistoryOpen((prev) => {
      const next = !prev;
      writeHistoryOpenPreference(next);
      return next;
    });
  }

  async function refreshDays() {
    const all = await storageService.getAllDays();
    setDays(all);
  }

  async function refreshCustomCategories() {
    const categories = await storageService.getCustomCategories();
    setCustomCategories(categories);
  }

  async function refreshNotesForDate(targetDate: string) {
    const notes = await notesService.listNotesByDate(targetDate);
    setDayNotes(notes);
  }

  useEffect(() => {
    refreshDays().finally(() => setLoading(false));
    refreshCustomCategories();
  }, []);

  useEffect(() => {
    refreshNotesForDate(date);

    if (!editingDayId) {
      storageService.getDay(date).then((existing) => setDuplicateWarning(existing ?? null));
    } else {
      setDuplicateWarning(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, editingDayId]);

  const previewTotals = useMemo(() => {
    const achats = resolveLines(lines.achats).items;
    const ventes = resolveLines(lines.ventes).items;
    const depenses = resolveLines(lines.depenses).items;
    const affectations = resolveAffectations(affectationsRaw).values;
    return calculateFinancials(achats, ventes, depenses, affectations, defaultFinancialSettings);
  }, [lines, affectationsRaw]);

  function addLine(category: LineCategory) {
    setLines((prev) => ({
      ...prev,
      [category]: [...prev[category], createEmptyDraftLine(generateLocalId())],
    }));
  }

  function removeLine(category: LineCategory, id: string) {
    setLines((prev) => ({ ...prev, [category]: prev[category].filter((line) => line.id !== id) }));
  }

  function changeLine(category: LineCategory, id: string, patch: Partial<DraftLine>) {
    setLines((prev) => ({
      ...prev,
      [category]: prev[category].map((line) => (line.id === id ? { ...line, ...patch } : line)),
    }));
  }

  function changeAffectation(key: keyof AffectationsRaw, value: string) {
    setAffectationsRaw((prev) => ({ ...prev, [key]: value }));
  }

  function handleRequestAddCategory(lineId: string) {
    setAddCategoryForLineId(lineId);
  }

  async function handleConfirmAddCategory(label: string) {
    const category = await storageService.addCustomCategory(label);
    await refreshCustomCategories();
    if (addCategoryForLineId) {
      changeLine("depenses", addCategoryForLineId, { categorie: category.value });
    }
    setAddCategoryForLineId(null);
  }

  function resetForm() {
    setEditingDayId(null);
    setDate(todayIso());
    setLines({ achats: [], ventes: [], depenses: [] });
    setAffectationsRaw(emptyAffectationsRaw());
    setFormError(null);
  }

  /**
   * Message affiche quand une action directe (Modifier/Supprimer) est
   * bloquee parce que la semaine de cette journee est cloturee (voir
   * storageService.getWeekClosure / page Hebdomadaire). "Voir les
   * details" et la corbeille restent toujours disponibles, seule la
   * modification directe est protegee.
   */
  function weekClosureMessage(dateIso: string): string {
    return `Impossible de modifier cette journee : la semaine du ${dateIso} est cloturee. Rouvrez-la depuis la page Hebdomadaire pour la modifier.`;
  }

  /**
   * Meme principe que weekClosureMessage, pour le mois (voir
   * storageService.getMonthClosure / page Mensuelle).
   */
  function monthClosureMessage(dateIso: string): string {
    return `Impossible de modifier cette journee : le mois du ${dateIso} est cloture. Rouvrez-le depuis la page Mensuelle pour la modifier.`;
  }

  /**
   * Meme principe que weekClosureMessage, pour l'annee (voir
   * storageService.getYearClosure / page Annuelle).
   */
  function yearClosureMessage(dateIso: string): string {
    return `Impossible de modifier cette journee : l'annee ${dateIso.slice(0, 4)} est cloturee. Rouvrez-la depuis la page Annuelle pour la modifier.`;
  }

  async function handleEditDay(day: DayEntry) {
    const [weekClosed, monthClosed, yearClosed] = await Promise.all([
      storageService.getWeekClosure(startOfWeekIso(day.date)),
      storageService.getMonthClosure(startOfMonthIso(day.date)),
      storageService.getYearClosure(startOfYearIso(day.date)),
    ]);
    if (weekClosed || monthClosed || yearClosed) {
      setFormError(weekClosed ? weekClosureMessage(day.date) : monthClosed ? monthClosureMessage(day.date) : yearClosureMessage(day.date));
      setConfirmation(null);
      return;
    }

    setEditingDayId(day.id);
    setDate(day.date);
    setLines({
      achats: linesFromItems(day.achats),
      ventes: linesFromItems(day.ventes),
      depenses: linesFromItems(day.depenses),
    });
    setAffectationsRaw(affectationsRawFrom(day.affectationsRealisees));
    setFormError(null);
    setConfirmation(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleDeleteDay(day: DayEntry) {
    const [weekClosed, monthClosed, yearClosed] = await Promise.all([
      storageService.getWeekClosure(startOfWeekIso(day.date)),
      storageService.getMonthClosure(startOfMonthIso(day.date)),
      storageService.getYearClosure(startOfYearIso(day.date)),
    ]);
    if (weekClosed || monthClosed || yearClosed) {
      window.alert(weekClosed ? weekClosureMessage(day.date) : monthClosed ? monthClosureMessage(day.date) : yearClosureMessage(day.date));
      return;
    }

    const confirmed = window.confirm(`Deplacer la journee du ${day.date} vers la corbeille ?`);
    if (!confirmed) return;

    await storageService.softDeleteDay(day.id);
    if (editingDayId === day.id) resetForm();
    await refreshDays();
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setFormError(null);
    setConfirmation(null);

    if (!date) {
      setFormError("Veuillez choisir une date.");
      return;
    }

    const achats = resolveLines(lines.achats);
    const ventes = resolveLines(lines.ventes);
    const depenses = resolveLines(lines.depenses);
    const affectations = resolveAffectations(affectationsRaw);
    const allErrors = [...achats.errors, ...ventes.errors, ...depenses.errors, ...affectations.errors];
    if (allErrors.length > 0) {
      setFormError(allErrors[0]);
      return;
    }

    setSaving(true);
    try {
      await storageService.saveDay({
        id: editingDayId ?? undefined,
        date,
        achats: achats.items,
        ventes: ventes.items,
        depenses: depenses.items,
        affectationsRealisees: affectations.values,
        origine: "saisie",
      });
      setConfirmation(`Journee du ${date} enregistree.`);
      resetForm();
      await refreshDays();
    } catch (error) {
      if (error instanceof DuplicateDateError) {
        setFormError(
          "Une journee existe deja pour cette date. Utilisez « Modifier » depuis l'historique pour la mettre a jour."
        );
      } else {
        setFormError("Echec de l'enregistrement. Veuillez reessayer.");
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleAddNote(event: FormEvent) {
    event.preventDefault();
    const trimmed = newNoteText.trim();
    if (!trimmed) return;
    await notesService.saveNote({ date, texte: trimmed, statut: "ouverte" });
    setNewNoteText("");
    await refreshNotesForDate(date);
  }

  async function handleDeleteNote(id: string) {
    await notesService.deleteNote(id);
    await refreshNotesForDate(date);
  }

  async function handleExportCsv() {
    setCsvMessage(null);
    try {
      await downloadDetailedCsv();
    } catch {
      setCsvMessage({ type: "error", text: "Echec de l'export CSV." });
    }
  }

  function handleImportCsvClick() {
    csvFileInputRef.current?.click();
  }

  /**
   * Lit puis previsualise un CSV detaille. Si au moins une date du fichier
   * correspond deja a une journee active locale, l'import s'arrete ici et
   * ouvre CsvConflictModal : l'utilisateur choisit UNE FOIS (pas date par
   * date) de conserver ou remplacer TOUTES les dates en conflit, puis
   * finishImport() ecrit reellement les donnees (voir plus bas). Sans
   * conflit, l'import se termine directement.
   */
  async function handleImportCsvFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setImportingCsv(true);
    setCsvMessage(null);
    try {
      const text = await file.text();
      const preview = await csvMigrationService.previewImport(text);
      if (!preview.peutContinuer) {
        setCsvMessage({
          type: "error",
          text: preview.issues[0]?.message ?? "Fichier CSV invalide ou format non reconnu.",
        });
        return;
      }

      if (preview.conflicts.length > 0) {
        setCsvConflictPreview(preview);
        return;
      }

      await finishImport(preview, "keep");
    } catch {
      setCsvMessage({ type: "error", text: "Impossible de lire ce fichier CSV." });
      setImportingCsv(false);
    }
  }

  function handleCsvConflictCancel() {
    setCsvConflictPreview(null);
    setImportingCsv(false);
    setCsvMessage({ type: "warning", text: "Import annule : aucune donnee ecrite." });
  }

  async function handleCsvConflictResolve(resolution: CsvConflictResolution) {
    const preview = csvConflictPreview;
    setCsvConflictPreview(null);
    if (!preview) return;
    setImportingCsv(true);
    await finishImport(preview, resolution);
  }

  /**
   * Ecrit reellement l'import (csvMigrationService.confirmImport) et
   * construit un message qui distingue toujours importees/remplacees/
   * conservees/erreurs -- jamais presente comme un succes si rien n'a ete
   * ecrit (imported=0 ET replaced=0), voir messageType ci-dessous.
   */
  async function finishImport(preview: CsvImportPreview, conflictResolution: CsvConflictResolution) {
    try {
      const result = await csvMigrationService.confirmImport(preview, { conflictResolution });
      const lignesIgnorees = preview.issues.length;
      const lignesImportees = preview.totalLignes - lignesIgnorees;

      const parts: string[] = [
        `${preview.totalLignes} ligne(s) detectee(s)`,
        `${lignesImportees} ligne(s) valide(s)`,
      ];
      if (lignesIgnorees > 0) {
        const raisons = [...new Set(preview.issues.slice(0, 3).map((issue) => issue.message))].join(" ");
        parts.push(`${lignesIgnorees} ligne(s) ignoree(s) (${raisons}${preview.issues.length > 3 ? " ..." : ""})`);
      }
      if (preview.conflicts.length > 0) {
        parts.push(
          `${preview.conflicts.length} date(s) en conflit (${conflictResolution === "replace" ? "remplacees" : "conservees"})`
        );
      }
      if (result.imported.length > 0) parts.push(`${result.imported.length} journee(s) importee(s)`);
      if (result.replaced.length > 0) parts.push(`${result.replaced.length} journee(s) remplacee(s)`);
      if (result.skipped.length > 0) parts.push(`${result.skipped.length} journee(s) conservee(s) (non modifiees)`);
      if (result.errors.length > 0) parts.push(`${result.errors.length} erreur(s)`);

      const wroteSomething = result.imported.length > 0 || result.replaced.length > 0;
      const messageType: "success" | "warning" | "error" = result.errors.length > 0 ? "error" : wroteSomething ? "success" : "warning";
      const prefix = messageType === "warning" ? "Aucune donnee ecrite. " : "";

      setCsvMessage({ type: messageType, text: `${prefix}${parts.join(". ")}.` });

      await refreshDays();
      await refreshCustomCategories();
    } catch {
      setCsvMessage({ type: "error", text: "Impossible de lire ce fichier CSV." });
    } finally {
      setImportingCsv(false);
    }
  }

  /**
   * Reinitialisation globale de l'historique financier (voir
   * ResetHistoryModal pour la double confirmation obligatoire, deja
   * effectuee avant que cette fonction ne soit appelee). Deplace toutes
   * les journees actives vers la corbeille (storageService.softDeleteAllDays,
   * meme mecanisme qu'une suppression individuelle : restaurable, se
   * propage normalement au cloud) : ne touche jamais aux notes, aux
   * categories personnalisees ni aux reglages (objectif de vente, etc.).
   */
  async function handleResetHistory() {
    const count = await storageService.softDeleteAllDays();
    setResetModalOpen(false);
    setResetMessage(
      count > 0 ? `✅ ${count} journee(s) deplacee(s) vers la corbeille.` : "Aucune journee active a deplacer."
    );
    if (editingDayId) resetForm();
    setDuplicateWarning(null);
    await refreshDays();
  }

  return (
    <div className="daily-page">
      <Card>
        <form className="daily-page__form" onSubmit={handleSubmit}>
          <div className="daily-page__form-header">
            <h2 className="daily-page__form-title">
              {editingDayId ? "Modifier la journee" : "Nouvelle journee"}
            </h2>
            {editingDayId && (
              <button type="button" className="daily-page__cancel-edit" onClick={resetForm}>
                Annuler
              </button>
            )}
          </div>

          <label className="daily-page__label" htmlFor="daily-date">
            Date
          </label>
          <input
            id="daily-date"
            type="date"
            className="daily-page__date-input"
            value={date}
            onChange={(event) => setDate(event.target.value)}
          />

          {duplicateWarning && (
            <p className="daily-page__warning">
              Une journee existe deja pour cette date.{" "}
              <button
                type="button"
                className="daily-page__link-button"
                onClick={() => handleEditDay(duplicateWarning)}
              >
                La modifier
              </button>{" "}
              au lieu d'en creer une nouvelle.
            </p>
          )}

          <OperationLineEditor
            title="Achats"
            items={lines.achats}
            onAdd={() => addLine("achats")}
            onRemove={(id) => removeLine("achats", id)}
            onChange={(id, patch) => changeLine("achats", id, patch)}
            placeholder="Ex: Bible"
          />

          <OperationLineEditor
            title="Ventes"
            items={lines.ventes}
            onAdd={() => addLine("ventes")}
            onRemove={(id) => removeLine("ventes", id)}
            onChange={(id, patch) => changeLine("ventes", id, patch)}
            placeholder="Ex: Bible"
          />

          <OperationLineEditor
            title="Depenses"
            items={lines.depenses}
            onAdd={() => addLine("depenses")}
            onRemove={(id) => removeLine("depenses", id)}
            onChange={(id, patch) => changeLine("depenses", id, patch)}
            categories={depenseCategoryOptions}
            onRequestAddCategory={handleRequestAddCategory}
            placeholder="Ex: Transport"
          />

          <AffectationsInput values={affectationsRaw} onChange={changeAffectation} />

          <FinancialSummary totals={previewTotals} />
          <AffectationsSummary affectations={previewTotals.affectations} />

          {formError && <p className="daily-page__error">{formError}</p>}
          {confirmation && <p className="daily-page__confirmation">{confirmation}</p>}

          <Button type="submit" disabled={saving || Boolean(duplicateWarning && !editingDayId)}>
            {saving ? "Enregistrement..." : "Enregistrer la journee"}
          </Button>
        </form>
      </Card>

      <Card className="daily-page__notes">
        <CollapsibleSection title={`Notes importantes du ${date}`} icon="📝" panelId="daily-notes-panel">
          <form className="daily-page__notes-form" onSubmit={handleAddNote}>
            <input
              type="text"
              className="daily-page__notes-input"
              value={newNoteText}
              onChange={(event) => setNewNoteText(event.target.value)}
              placeholder="Ex: Dette fournisseur 50000"
              aria-label="Nouvelle note pour cette date"
            />
            <Button type="submit" variant="secondary" disabled={newNoteText.trim().length === 0}>
              Ajouter
            </Button>
          </form>
          {dayNotes.length === 0 ? (
            <p className="daily-page__notes-empty">Aucune note pour cette date.</p>
          ) : (
            <ul className="daily-page__notes-list">
              {dayNotes.map((note) => (
                <li key={note.id} className="daily-page__notes-item">
                  <span>{note.texte}</span>
                  <button type="button" onClick={() => handleDeleteNote(note.id)} aria-label="Supprimer la note">
                    Supprimer
                  </button>
                </li>
              ))}
            </ul>
          )}
        </CollapsibleSection>
      </Card>

      <div className="daily-page__history">
        <div className="daily-page__history-header">
          <button
            type="button"
            className="daily-page__history-toggle"
            onClick={toggleHistory}
            aria-expanded={historyOpen}
            aria-controls="daily-history-panel"
          >
            <span aria-hidden="true">📋</span> Historique{" "}
            <span className="daily-page__history-chevron" aria-hidden="true">
              {historyOpen ? "▲" : "▼"}
            </span>
          </button>
          <Link to="/corbeille" className="daily-page__trash-link">
            Corbeille
          </Link>
        </div>

        <div className="daily-page__csv-actions">
          <Button type="button" variant="secondary" onClick={handleExportCsv}>
            📤 Exporter CSV detaille
          </Button>
          <Button type="button" variant="secondary" onClick={handleImportCsvClick} disabled={importingCsv}>
            {importingCsv ? "Import en cours..." : "📥 Importer CSV detaille"}
          </Button>
          <input
            ref={csvFileInputRef}
            type="file"
            accept=".csv,text/csv"
            className="daily-page__csv-file-input"
            onChange={handleImportCsvFile}
            aria-label="Choisir un fichier CSV a importer"
          />
        </div>
        {csvMessage && (
          <p
            className={
              csvMessage.type === "error"
                ? "daily-page__error"
                : csvMessage.type === "warning"
                  ? "daily-page__csv-warning"
                  : "daily-page__confirmation"
            }
          >
            {csvMessage.text}
          </p>
        )}

        <div className="daily-page__reset-actions">
          <button
            type="button"
            className="daily-page__reset-trigger"
            onClick={() => {
              setResetMessage(null);
              setResetModalOpen(true);
            }}
          >
            🗑️ Reinitialiser tout l'historique
          </button>
        </div>
        {resetMessage && <p className="daily-page__confirmation">{resetMessage}</p>}

        {historyOpen && (
          <div id="daily-history-panel">
            {loading ? (
              <p className="daily-page__notes-empty">Chargement...</p>
            ) : (
              <DayHistoryList
                days={days}
                onEdit={handleEditDay}
                onDelete={handleDeleteDay}
                customCategories={customCategories}
              />
            )}
          </div>
        )}
      </div>

      {addCategoryForLineId && (
        <AddCategoryModal
          onCancel={() => setAddCategoryForLineId(null)}
          onConfirm={handleConfirmAddCategory}
        />
      )}

      {resetModalOpen && (
        <ResetHistoryModal onCancel={() => setResetModalOpen(false)} onConfirm={handleResetHistory} />
      )}

      {csvConflictPreview && (
        <CsvConflictModal
          dates={csvConflictPreview.conflicts}
          onCancel={handleCsvConflictCancel}
          onResolve={handleCsvConflictResolve}
        />
      )}
    </div>
  );
}
