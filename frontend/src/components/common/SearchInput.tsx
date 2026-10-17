import { Search, X } from "lucide-react";

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label: string;
}

export function SearchInput({ value, onChange, placeholder = "Search…", label }: SearchInputProps) {
  return (
    <label className="inventory-search">
      <Search size={16} aria-hidden="true" />
      <input type="search" aria-label={label} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />
      {value ? <button className="icon-button icon-button--small" type="button" aria-label="Clear search" onClick={() => onChange("")}><X size={14} /></button> : null}
    </label>
  );
}
