import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { OperationLineEditor } from "@/components/finance/OperationLineEditor";
import { FinancialSummary } from "@/components/finance/FinancialSummary";
import { DayHistoryList } from "@/components/finance/DayHistoryList";
import { AddCategoryModal } from "@/components/finance/AddCategoryModal";
import { createEmptyDraftLine, type DraftLine } from "@/components/finance/types";
import { calculateFinancials, defaultFinancialSettings } from "@/services/finance";
import { storageService } from "@/services/storage";
import { DuplicateDateError } from "@/services/storage/indexedDbStorage";
import { notesService } from "@/services/notesService";
import { parseMontant, isValidMontant } from "@/utils/amount";
import { todayIso } from "@/utils/date";
import { mergeCategories } from "@/types";
import type { DayEntry, Note, OperationItem, CustomDepenseCategory } from "@/types";
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
    return calculateFinancials(achats, ventes, depenses, defaultFinancialSettings);
  }, [lines]);

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
    setFormError(null);
  }

  function handleEditDay(day: DayEntry) {
    setEditingDayId(day.id);
    setDate(day.date);
    setLines({
      achats: linesFromItems(day.achats),
      ventes: linesFromItems(day.ventes),
      depenses: linesFromItems(day.depenses),
    });
    setFormError(null);
    setConfirmation(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleDeleteDay(day: DayEntry) {
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
    const allErrors = [...achats.errors, ...ventes.errors, ...depenses.errors];
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

          <FinancialSummary totals={previewTotals} />

          {formError && <p className="daily-page__error">{formError}</p>}
          {confirmation && <p className="daily-page__confirmation">{confirmation}</p>}

          <Button type="submit" disabled={saving || Boolean(duplicateWarning && !editingDayId)}>
            {saving ? "Enregistrement..." : "Enregistrer la journee"}
          </Button>
        </form>
      </Card>

      <Card className="daily-page__notes">
        <h3 className="daily-page__notes-title">Notes importantes du {date}</h3>
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
    </div>
  );
}
