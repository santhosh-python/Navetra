import { Search, X } from 'lucide-react';

interface SearchInputProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function SearchInput({ id, label, value, onChange, placeholder, className }: SearchInputProps) {
  return (
    <div className={`search ${className ?? ''}`} role="search">
      <label htmlFor={id} className="visually-hidden">
        {label}
      </label>
      <Search size={16} className="search__icon" aria-hidden="true" />
      <input
        id={id}
        type="search"
        className="input"
        value={value}
        placeholder={placeholder ?? 'Search by name or SKU'}
        onChange={(event) => onChange(event.target.value)}
        autoComplete="off"
        style={value ? { paddingRight: 32 } : undefined}
      />
      {value && (
        <button
          type="button"
          className="btn btn--ghost btn--icon btn--sm"
          style={{ position: 'absolute', right: 2, top: '50%', transform: 'translateY(-50%)' }}
          aria-label="Clear search"
          onClick={() => onChange('')}
        >
          <X size={14} aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
