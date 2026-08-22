import { useEffect, useState, type FormEvent } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { CollapsibleSection } from "@/components/ui/CollapsibleSection";
import { storageService } from "@/services/storage";
import { setDeviseAffichage } from "@/utils/currency";
import { parseMontant, isValidMontant } from "@/utils/amount";
import type { AppPreferences, Devise, FormatRapport, Theme, Objectif, ObjectifType } from "@/types";
import "./SettingsPage.css";

const DEVISES: Devise[] = ["FC", "$", "€", "FCFA"];

const FORMATS_RAPPORT: { value: FormatRapport; label: string }[] = [
  { value: "pdf", label: "PDF" },
  { value: "csv", label: "CSV" },
];

const THEMES: { value: Theme; label: string }[] = [
  { value: "systeme", label: "Systeme (automatique)" },
  { value: "clair", label: "Clair" },
  { value: "sombre", label: "Sombre" },
];

const OBJECTIF_TYPES: { value: ObjectifType; label: string }[] = [
  { value: "epargne", label: "Objectif d'epargne" },
  { value: "ventes", label: "Objectif de ventes / revenus" },
  { value: "depenses", label: "Limite de depenses" },
  { value: "personnalise", label: "Objectif personnalise" },
];

const OBJECTIF_TYPE_LABELS: Record<ObjectifType, string> = Object.fromEntries(
  OBJECTIF_TYPES.map((entry) => [entry.value, entry.label])
) as Record<ObjectifType, string>;

/** Verifie un pourcentage saisi (0 a 100 inclus). Reutilise parseMontant/isValidMontant (memes regles que les autres montants saisis). */
function parsePercentage(raw: string): number | null {
  const value = parseMontant(raw);
  if (!isValidMontant(value) || value > 100) return null;
  return value;
}

const EMPTY_OBJECTIF_FORM = {
  type: "epargne" as ObjectifType,
  nom: "",
  montant: "",
  dateCible: "",
};

/**
 * Page Parametres : preferences locales uniquement (devise d'affichage,
 * pourcentages epargne/dime, objectifs financiers, format de rapport
 * prefere, preference d'apparence). Persistees via storageService
 * (IndexedDB), jamais synchronisees, jamais utilisees pour un calcul
 * existant (voir services/finance, useSummary) : purement des preferences
 * et indicateurs, a l'exception de la devise qui influence uniquement le
 * texte affiche par formatMontant (aucune conversion/recalcul de montant).
 */
export function SettingsPage() {
  const [preferences, setPreferences] = useState<AppPreferences | null>(null);
  const [loading, setLoading] = useState(true);

  const [epargneInput, setEpargneInput] = useState("");
  const [epargneError, setEpargneError] = useState<string | null>(null);
  const [epargneSaved, setEpargneSaved] = useState(false);

  const [dimeInput, setDimeInput] = useState("");
  const [dimeError, setDimeError] = useState<string | null>(null);
  const [dimeSaved, setDimeSaved] = useState(false);

  const [objectifs, setObjectifs] = useState<Objectif[]>([]);
  const [objectifForm, setObjectifForm] = useState(EMPTY_OBJECTIF_FORM);
  const [objectifError, setObjectifError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([storageService.getPreferences(), storageService.getObjectifs()]).then(([prefs, objectifsList]) => {
      setPreferences(prefs);
      setEpargneInput(String(prefs.pourcentageEpargne));
      setDimeInput(String(prefs.pourcentageDime));
      setObjectifs(objectifsList);
      setLoading(false);
    });
  }, []);

  async function persistPreferences(next: AppPreferences) {
    setPreferences(next);
    await storageService.savePreferences(next);
  }

  async function handleDeviseChange(devise: Devise) {
    if (!preferences) return;
    const next = { ...preferences, devise };
    await persistPreferences(next);
    setDeviseAffichage(devise);
  }

  async function handleFormatRapportChange(formatRapportPrefere: FormatRapport) {
    if (!preferences) return;
    await persistPreferences({ ...preferences, formatRapportPrefere });
  }

  async function handleThemeChange(theme: Theme) {
    if (!preferences) return;
    await persistPreferences({ ...preferences, theme });
  }

  async function handleEpargneSubmit(event: FormEvent) {
    event.preventDefault();
    if (!preferences) return;
    const value = parsePercentage(epargneInput);
    if (value === null) {
      setEpargneError("Entrez un pourcentage valide entre 0 et 100.");
      setEpargneSaved(false);
      return;
    }
    setEpargneError(null);
    await persistPreferences({ ...preferences, pourcentageEpargne: value });
    setEpargneSaved(true);
  }

  async function handleDimeSubmit(event: FormEvent) {
    event.preventDefault();
    if (!preferences) return;
    const value = parsePercentage(dimeInput);
    if (value === null) {
      setDimeError("Entrez un pourcentage valide entre 0 et 100.");
      setDimeSaved(false);
      return;
    }
    setDimeError(null);
    await persistPreferences({ ...preferences, pourcentageDime: value });
    setDimeSaved(true);
  }

  function startEditObjectif(objectif: Objectif) {
    setEditingId(objectif.id);
    setObjectifForm({
      type: objectif.type,
      nom: objectif.nom,
      montant: String(objectif.montantCible),
      dateCible: objectif.dateCible ?? "",
    });
    setObjectifError(null);
  }

  function cancelObjectifEdit() {
    setEditingId(null);
    setObjectifForm(EMPTY_OBJECTIF_FORM);
    setObjectifError(null);
  }

  async function handleObjectifSubmit(event: FormEvent) {
    event.preventDefault();
    const nom = objectifForm.nom.trim();
    const montantCible = parseMontant(objectifForm.montant);

    if (!nom) {
      setObjectifError("Le nom de l'objectif est obligatoire.");
      return;
    }
    if (!isValidMontant(montantCible)) {
      setObjectifError("Entrez un montant cible valide.");
      return;
    }
    setObjectifError(null);

    const input = {
      type: objectifForm.type,
      nom,
      montantCible,
      dateCible: objectifForm.dateCible || undefined,
    };

    if (editingId) {
      const updated = await storageService.updateObjectif(editingId, input);
      setObjectifs((prev) => prev.map((o) => (o.id === editingId ? updated : o)));
    } else {
      const created = await storageService.addObjectif(input);
      setObjectifs((prev) => [...prev, created]);
    }
    cancelObjectifEdit();
  }

  async function handleDeleteObjectif(id: string) {
    if (pendingDeleteId !== id) {
      setPendingDeleteId(id);
      return;
    }
    await storageService.deleteObjectif(id);
    setObjectifs((prev) => prev.filter((o) => o.id !== id));
    setPendingDeleteId(null);
    if (editingId === id) cancelObjectifEdit();
  }

  if (loading || !preferences) {
    return (
      <div className="settings-page">
        <p className="settings-page__loading">Chargement...</p>
      </div>
    );
  }

  return (
    <div className="settings-page">
      <CollapsibleSection title="Devise" icon="💱" panelId="settings-devise" defaultOpen>
        <Card>
          <p className="settings-page__hint">
            Devise utilisee pour l'affichage des montants dans l'application. Ce choix ne convertit ni ne recalcule
            aucune donnee deja enregistree.
          </p>
          <div className="settings-page__choices">
            {DEVISES.map((devise) => (
              <label key={devise} className="settings-page__choice">
                <input
                  type="radio"
                  name="devise"
                  value={devise}
                  checked={preferences.devise === devise}
                  onChange={() => handleDeviseChange(devise)}
                />
                {devise}
              </label>
            ))}
          </div>
        </Card>
      </CollapsibleSection>

      <CollapsibleSection title="Pourcentage d'epargne" icon="🏦" panelId="settings-epargne">
        <Card>
          <form
            className="settings-page__form"
            onSubmit={handleEpargneSubmit}
            onChange={() => setEpargneSaved(false)}
          >
            <label className="settings-page__label" htmlFor="settings-epargne-input">
              Pourcentage d'epargne (%)
            </label>
            <input
              id="settings-epargne-input"
              type="text"
              inputMode="decimal"
              className="settings-page__input"
              value={epargneInput}
              onChange={(event) => setEpargneInput(event.target.value)}
            />
            {epargneError && <p className="settings-page__error">{epargneError}</p>}
            {epargneSaved && !epargneError && <p className="settings-page__success">Enregistre.</p>}
            <Button type="submit">Enregistrer</Button>
          </form>
        </Card>
      </CollapsibleSection>

      <CollapsibleSection title="Pourcentage de dime" icon="🙏" panelId="settings-dime">
        <Card>
          <form className="settings-page__form" onSubmit={handleDimeSubmit} onChange={() => setDimeSaved(false)}>
            <label className="settings-page__label" htmlFor="settings-dime-input">
              Pourcentage de dime (%)
            </label>
            <input
              id="settings-dime-input"
              type="text"
              inputMode="decimal"
              className="settings-page__input"
              value={dimeInput}
              onChange={(event) => setDimeInput(event.target.value)}
            />
            {dimeError && <p className="settings-page__error">{dimeError}</p>}
            {dimeSaved && !dimeError && <p className="settings-page__success">Enregistre.</p>}
            <Button type="submit">Enregistrer</Button>
          </form>
        </Card>
      </CollapsibleSection>

      <CollapsibleSection title="Objectifs financiers" icon="🎯" panelId="settings-objectifs">
        <Card>
          <form className="settings-page__form" onSubmit={handleObjectifSubmit}>
            <label className="settings-page__label" htmlFor="objectif-type">
              Type d'objectif
            </label>
            <select
              id="objectif-type"
              className="settings-page__input"
              value={objectifForm.type}
              onChange={(event) =>
                setObjectifForm((prev) => ({ ...prev, type: event.target.value as ObjectifType }))
              }
            >
              {OBJECTIF_TYPES.map((entry) => (
                <option key={entry.value} value={entry.value}>
                  {entry.label}
                </option>
              ))}
            </select>

            <label className="settings-page__label" htmlFor="objectif-nom">
              Nom de l'objectif
            </label>
            <input
              id="objectif-nom"
              type="text"
              className="settings-page__input"
              placeholder="Ex: Epargner 5 000 000 FC"
              value={objectifForm.nom}
              onChange={(event) => setObjectifForm((prev) => ({ ...prev, nom: event.target.value }))}
            />

            <label className="settings-page__label" htmlFor="objectif-montant">
              Montant cible
            </label>
            <input
              id="objectif-montant"
              type="text"
              inputMode="decimal"
              className="settings-page__input"
              value={objectifForm.montant}
              onChange={(event) => setObjectifForm((prev) => ({ ...prev, montant: event.target.value }))}
            />

            <label className="settings-page__label" htmlFor="objectif-date">
              Date cible (optionnelle)
            </label>
            <input
              id="objectif-date"
              type="date"
              className="settings-page__input"
              value={objectifForm.dateCible}
              onChange={(event) => setObjectifForm((prev) => ({ ...prev, dateCible: event.target.value }))}
            />

            {objectifError && <p className="settings-page__error">{objectifError}</p>}

            <div className="settings-page__form-actions">
              <Button type="submit">{editingId ? "Enregistrer les modifications" : "Ajouter l'objectif"}</Button>
              {editingId && (
                <Button type="button" variant="secondary" onClick={cancelObjectifEdit}>
                  Annuler
                </Button>
              )}
            </div>
          </form>

          <div className="settings-page__objectifs-list">
            {objectifs.length === 0 && <p className="settings-page__hint">Aucun objectif pour le moment.</p>}
            {objectifs.map((objectif) => (
              <div key={objectif.id} className="settings-page__objectif">
                <div className="settings-page__objectif-info">
                  <span className="settings-page__objectif-type">{OBJECTIF_TYPE_LABELS[objectif.type]}</span>
                  <span className="settings-page__objectif-nom">{objectif.nom}</span>
                  <span className="settings-page__objectif-montant">
                    Cible : {objectif.montantCible.toLocaleString("fr-FR")} {preferences.devise}
                    {objectif.dateCible ? ` — avant le ${objectif.dateCible}` : ""}
                  </span>
                </div>
                <div className="settings-page__objectif-actions">
                  <button
                    type="button"
                    className="settings-page__link-btn"
                    onClick={() => startEditObjectif(objectif)}
                  >
                    Modifier
                  </button>
                  <button
                    type="button"
                    className="settings-page__link-btn settings-page__link-btn--danger"
                    onClick={() => handleDeleteObjectif(objectif.id)}
                  >
                    {pendingDeleteId === objectif.id ? "Confirmer la suppression ?" : "Supprimer"}
                  </button>
                  {pendingDeleteId === objectif.id && (
                    <button
                      type="button"
                      className="settings-page__link-btn"
                      onClick={() => setPendingDeleteId(null)}
                    >
                      Annuler
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      </CollapsibleSection>

      <CollapsibleSection title="Format des rapports" icon="📄" panelId="settings-rapports">
        <Card>
          <p className="settings-page__hint">Format prefere pour l'export des rapports.</p>
          <div className="settings-page__choices">
            {FORMATS_RAPPORT.map((entry) => (
              <label key={entry.value} className="settings-page__choice">
                <input
                  type="radio"
                  name="format-rapport"
                  value={entry.value}
                  checked={preferences.formatRapportPrefere === entry.value}
                  onChange={() => handleFormatRapportChange(entry.value)}
                />
                {entry.label}
              </label>
            ))}
          </div>
        </Card>
      </CollapsibleSection>

      <CollapsibleSection title="Preferences d'affichage" icon="🎨" panelId="settings-affichage">
        <Card>
          <p className="settings-page__hint">Apparence preferee de l'application.</p>
          <div className="settings-page__choices">
            {THEMES.map((entry) => (
              <label key={entry.value} className="settings-page__choice">
                <input
                  type="radio"
                  name="theme"
                  value={entry.value}
                  checked={preferences.theme === entry.value}
                  onChange={() => handleThemeChange(entry.value)}
                />
                {entry.label}
              </label>
            ))}
          </div>
        </Card>
      </CollapsibleSection>
    </div>
  );
}
