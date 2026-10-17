import { useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import { useInventory } from '../../hooks/useInventory';
import { matchesSearch } from '../../lib/inventoryQuery';
import { RiskBadge } from '../common/StatusBadge';
import { useDismissable } from '../../hooks/useDismissable';

/** Finds items by name or SKU and opens the item detail page. */
export function GlobalSearch() {
  const { rows } = useInventory();
  const navigate = useNavigate();
  const [term, setTerm] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useDismissable<HTMLDivElement>(open, () => setOpen(false));

  const results = useMemo(() => {
    if (!term.trim()) return [];
    return rows.filter(({ item }) => matchesSearch(item, term)).slice(0, 8);
  }, [rows, term]);

  const choose = (itemId: string) => {
    setOpen(false);
    setTerm('');
    navigate(`/inventory/${encodeURIComponent(itemId)}`);
  };

  const handleKey = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActive((current) => Math.min(current + 1, Math.max(0, results.length - 1)));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActive((current) => Math.max(current - 1, 0));
    } else if (event.key === 'Enter' && results[active]) {
      event.preventDefault();
      choose(results[active].item.id);
    } else if (event.key === 'Escape') {
      setTerm('');
      setOpen(false);
    }
  };

  return (
    <div className="search" ref={containerRef} role="search">
      <label htmlFor="global-search" className="visually-hidden">
        Find an item by name or SKU
      </label>
      <Search size={16} className="search__icon" aria-hidden="true" />
      <input
        ref={inputRef}
        id="global-search"
        type="search"
        className="input"
        placeholder="Find an item or SKU"
        value={term}
        autoComplete="off"
        role="combobox"
        aria-expanded={open && results.length > 0}
        aria-controls="global-search-results"
        aria-autocomplete="list"
        aria-activedescendant={results[active] ? `search-option-${results[active].item.id}` : undefined}
        onChange={(event) => {
          setTerm(event.target.value);
          setActive(0);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKey}
      />
      {open && term.trim() && (
        <div className="search__results" id="global-search-results" role="listbox" aria-label="Matching items">
          {results.length === 0 && <p className="text-muted text-small" style={{ padding: 10 }}>No item matches “{term}”.</p>}
          {results.map(({ item, analysis }, index) => (
            <button
              key={item.id}
              id={`search-option-${item.id}`}
              type="button"
              role="option"
              aria-selected={index === active}
              className="search__result"
              onMouseEnter={() => setActive(index)}
              onClick={() => choose(item.id)}
            >
              <span>
                <span className="table__primary" style={{ display: 'block' }}>
                  {item.name}
                </span>
                <span className="search__result-sku">{item.sku}</span>
              </span>
              <RiskBadge risk={analysis.risk} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
