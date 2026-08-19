import { useEffect, useState } from "react";
import { SearchBar } from "@/components/ui/SearchBar";
import { Card } from "@/components/ui/Card";
import { searchService } from "@/services/search/searchService";
import { formatDateFr } from "@/utils/date";
import { formatMontant } from "@/utils/format";
import type { SearchResult } from "@/types";
import "./SearchPage.css";

export function SearchPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);

  useEffect(() => {
    let cancelled = false;
    searchService.search(query).then((found) => {
      if (!cancelled) setResults(found);
    });
    return () => {
      cancelled = true;
    };
  }, [query]);

  return (
    <div className="search-page">
      <SearchBar value={query} onChange={setQuery} placeholder="Rechercher une date, un article, une note..." />

      {query.trim().length === 0 && (
        <p className="search-page__hint">
          Recherchez dans vos journees, achats, ventes, depenses et notes.
        </p>
      )}

      {query.trim().length > 0 && results.length === 0 && (
        <p className="search-page__hint">Aucun resultat pour « {query} ».</p>
      )}

      <ul className="search-page__results">
        {results.map((result) => (
          <li key={`${result.kind}-${result.id}`}>
            <Card className="search-page__result">
              <span className="search-page__kind">{result.kind}</span>
              <p className="search-page__label">{result.label}</p>
              <div className="search-page__meta">
                <span>{formatDateFr(result.date)}</span>
                {result.montant !== undefined && <span>{formatMontant(result.montant)}</span>}
              </div>
            </Card>
          </li>
        ))}
      </ul>
    </div>
  );
}
