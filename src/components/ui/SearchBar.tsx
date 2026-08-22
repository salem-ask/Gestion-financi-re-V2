import type { ChangeEvent } from "react";
import "./SearchBar.css";

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

/**
 * Champ de recherche global, pret a etre branche sur searchService.
 * Pour cette etape, il n'affiche pas encore de resultats.
 */
export function SearchBar({ value, onChange, placeholder = "Rechercher..." }: SearchBarProps) {
  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    onChange(event.target.value);
  }

  return (
    <div className="search-bar">
      <span className="search-bar__icon" aria-hidden="true">
        🔍
      </span>
      <input
        type="search"
        className="search-bar__input"
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        aria-label="Recherche globale"
        enterKeyHint="search"
      />
    </div>
  );
}
