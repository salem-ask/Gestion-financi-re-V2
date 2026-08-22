import { Button } from "@/components/ui/Button";
import { parseMontant, isValidMontant } from "@/utils/amount";
import { formatMontant } from "@/utils/format";
import type { CategoryOption } from "@/types";
import type { DraftLine } from "./types";
import "./OperationLineEditor.css";

/** Valeur sentinelle de l'option "Ajouter une categorie" dans le selecteur. */
const ADD_CATEGORY_OPTION = "__add_category__";

interface OperationLineEditorProps {
  title: string;
  items: DraftLine[];
  onAdd: () => void;
  onRemove: (id: string) => void;
  onChange: (id: string, patch: Partial<DraftLine>) => void;
  /** Liste des categories a proposer (fixes + personnalisees). Absent = pas de selecteur (achats/ventes). */
  categories?: CategoryOption[];
  /** Appele quand l'utilisateur choisit "Ajouter une categorie" sur une ligne. */
  onRequestAddCategory?: (lineId: string) => void;
  placeholder?: string;
}

/**
 * Editeur generique de lignes (achats / ventes / depenses). Reutilise pour
 * les trois types d'operations : seule la presence du selecteur de
 * categorie change (uniquement pertinent pour les depenses).
 */
export function OperationLineEditor({
  title,
  items,
  onAdd,
  onRemove,
  onChange,
  categories,
  onRequestAddCategory,
  placeholder = "Libelle",
}: OperationLineEditorProps) {
  const total = items.reduce((sum, item) => {
    const value = parseMontant(item.montantRaw);
    return sum + (isValidMontant(value) ? value : 0);
  }, 0);

  return (
    <div className="operation-editor">
      <div className="operation-editor__header">
        <h3 className="operation-editor__title">{title}</h3>
        <span className="operation-editor__total">{formatMontant(total)}</span>
      </div>

      <ul className="operation-editor__list">
        {items.map((item) => {
          const parsed = parseMontant(item.montantRaw);
          const hasError = item.montantRaw.trim() !== "" && !isValidMontant(parsed);
          return (
            <li key={item.id} className="operation-editor__row">
              <input
                type="text"
                className="operation-editor__input operation-editor__input--libelle"
                value={item.libelle}
                onChange={(event) => onChange(item.id, { libelle: event.target.value })}
                placeholder={placeholder}
                aria-label={`${placeholder} (${title})`}
              />
              <input
                type="text"
                inputMode="decimal"
                className={`operation-editor__input operation-editor__input--montant ${hasError ? "has-error" : ""}`}
                value={item.montantRaw}
                onChange={(event) => onChange(item.id, { montantRaw: event.target.value })}
                placeholder="Montant"
                aria-label={`Montant (${title})`}
              />
              {categories && (
                <select
                  className="operation-editor__select"
                  value={item.categorie ?? ""}
                  onChange={(event) => {
                    const selected = event.target.value;
                    if (selected === ADD_CATEGORY_OPTION) {
                      onRequestAddCategory?.(item.id);
                      return;
                    }
                    onChange(item.id, { categorie: selected || undefined });
                  }}
                  aria-label={`Categorie (${title})`}
                >
                  <option value="">Categorie...</option>
                  {categories.map((cat) => (
                    <option key={cat.value} value={cat.value}>
                      {cat.label}
                    </option>
                  ))}
                  <option value={ADD_CATEGORY_OPTION}>➕ Ajouter une categorie</option>
                </select>
              )}
              <button
                type="button"
                className="operation-editor__remove"
                onClick={() => onRemove(item.id)}
                aria-label="Supprimer la ligne"
              >
                &times;
              </button>
              {hasError && <p className="operation-editor__error">Montant invalide</p>}
            </li>
          );
        })}
      </ul>

      <Button type="button" variant="secondary" onClick={onAdd} className="operation-editor__add">
        + Ajouter une ligne
      </Button>
    </div>
  );
}
