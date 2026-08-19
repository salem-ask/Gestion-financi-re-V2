import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { trashService } from "@/services/trash/trashService";
import { formatDateFr } from "@/utils/date";
import type { TrashItem } from "@/types";
import "./TrashPage.css";

export function TrashPage() {
  const [items, setItems] = useState<TrashItem[]>([]);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    const list = await trashService.listTrash();
    setItems(list);
  }

  useEffect(() => {
    refresh().finally(() => setLoading(false));
  }, []);

  async function handleRestore(item: TrashItem) {
    await trashService.restoreItem(item);
    await refresh();
  }

  async function handlePurge(item: TrashItem) {
    const confirmed = window.confirm(
      `Supprimer definitivement cet element (${item.kind === "jour" ? "journee" : "note"}) ? Cette action est irreversible.`
    );
    if (!confirmed) return;
    await trashService.purgeItem(item);
    await refresh();
  }

  async function handleEmptyTrash() {
    if (items.length === 0) return;
    const confirmed = window.confirm(`Vider definitivement la corbeille (${items.length} element(s)) ?`);
    if (!confirmed) return;
    await trashService.emptyTrash();
    await refresh();
  }

  return (
    <div className="trash-page">
      <div className="trash-page__header">
        <p className="trash-page__intro">
          Les journees et notes supprimees restent ici avant suppression definitive.
        </p>
        <Button variant="secondary" onClick={handleEmptyTrash} disabled={items.length === 0}>
          Vider la corbeille
        </Button>
      </div>

      {loading && <p className="trash-page__empty">Chargement...</p>}
      {!loading && items.length === 0 && <p className="trash-page__empty">La corbeille est vide.</p>}

      <ul className="trash-page__list">
        {items.map((item) => (
          <li key={`${item.kind}-${item.id}`}>
            <Card className="trash-page__item">
              <div className="trash-page__item-info">
                <span className="trash-page__item-kind">{item.kind === "jour" ? "Journee" : "Note"}</span>
                <p className="trash-page__item-label">{item.label}</p>
                <span className="trash-page__item-date">
                  {formatDateFr(item.date)} - supprime le {formatDateFr(item.deletedAt.slice(0, 10))}
                </span>
              </div>
              <div className="trash-page__item-actions">
                <button type="button" onClick={() => handleRestore(item)}>
                  Restaurer
                </button>
                <button type="button" className="trash-page__purge" onClick={() => handlePurge(item)}>
                  Supprimer definitivement
                </button>
              </div>
            </Card>
          </li>
        ))}
      </ul>
    </div>
  );
}
