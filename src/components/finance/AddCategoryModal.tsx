import { useEffect, useRef, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import "./AddCategoryModal.css";

interface AddCategoryModalProps {
  onCancel: () => void;
  onConfirm: (label: string) => Promise<void>;
}

/**
 * Petite fenetre de saisie pour ajouter une categorie de depense
 * personnalisee. Volontairement compacte (pas de plein ecran) pour
 * rester confortable sur mobile (320px et plus).
 */
export function AddCategoryModal({ onCancel, onConfirm }: AddCategoryModalProps) {
  const [label, setLabel] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmed = label.trim();
    if (trimmed === "") {
      setError("Le nom de la categorie ne peut pas etre vide.");
      return;
    }

    setError(null);
    setSaving(true);
    try {
      await onConfirm(trimmed);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible d'ajouter cette categorie.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="add-category-modal__overlay" onClick={onCancel}>
      <div
        className="add-category-modal__card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-category-title"
        onClick={(event) => event.stopPropagation()}
      >
        <h3 id="add-category-title" className="add-category-modal__title">
          Nom de la nouvelle categorie
        </h3>
        <form onSubmit={handleSubmit}>
          <input
            ref={inputRef}
            type="text"
            className="add-category-modal__input"
            value={label}
            onChange={(event) => setLabel(event.target.value)}
            placeholder="Ex: Fournitures"
            aria-label="Nom de la nouvelle categorie"
          />
          {error && <p className="add-category-modal__error">{error}</p>}
          <div className="add-category-modal__actions">
            <Button type="button" variant="secondary" onClick={onCancel} disabled={saving}>
              Annuler
            </Button>
            <Button type="submit" disabled={saving || label.trim() === ""}>
              {saving ? "Ajout..." : "Valider"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
