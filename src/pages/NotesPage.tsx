import { useEffect, useState, type FormEvent } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { notesService } from "@/services/notesService";
import { todayIso, formatDateFr } from "@/utils/date";
import type { Note, NoteStatus } from "@/types";
import "./NotesPage.css";

const STATUS_LABELS: Record<NoteStatus, string> = {
  ouverte: "Ouverte",
  "en-cours": "En cours",
  resolue: "Resolue",
};

export function NotesPage() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [texte, setTexte] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    notesService
      .listNotes()
      .then(setNotes)
      .finally(() => setLoading(false));
  }, []);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmed = texte.trim();
    if (!trimmed) return;

    setSaving(true);
    try {
      const note = await notesService.saveNote({ date: todayIso(), texte: trimmed, statut: "ouverte" });
      setNotes((prev) => [note, ...prev]);
      setTexte("");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    await notesService.deleteNote(id);
    setNotes((prev) => prev.filter((note) => note.id !== id));
  }

  return (
    <div className="notes-page">
      <Card>
        <form className="notes-page__form" onSubmit={handleSubmit}>
          <label className="notes-page__label" htmlFor="note-texte">
            Nouvelle note
          </label>
          <textarea
            id="note-texte"
            className="notes-page__textarea"
            value={texte}
            onChange={(event) => setTexte(event.target.value)}
            placeholder="Ex: Client Dupont doit encore 5000"
            rows={3}
          />
          <Button type="submit" disabled={saving || texte.trim().length === 0}>
            Ajouter la note
          </Button>
        </form>
      </Card>

      <div className="notes-page__list">
        {loading && <p className="notes-page__empty">Chargement...</p>}
        {!loading && notes.length === 0 && (
          <p className="notes-page__empty">Aucune note pour le moment.</p>
        )}
        {notes.map((note) => (
          <Card key={note.id} className="notes-page__item">
            <div className="notes-page__item-header">
              <span className={`notes-page__status notes-page__status--${note.statut}`}>
                {STATUS_LABELS[note.statut]}
              </span>
              <span className="notes-page__date">{formatDateFr(note.date)}</span>
            </div>
            <p className="notes-page__text">{note.texte}</p>
            <button
              type="button"
              className="notes-page__delete"
              onClick={() => handleDelete(note.id)}
              aria-label="Supprimer la note"
            >
              Supprimer
            </button>
          </Card>
        ))}
      </div>
    </div>
  );
}
