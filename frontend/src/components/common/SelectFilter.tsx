interface SelectFilterProps {
  label: string;
  value: string;
  options: readonly string[];
  onChange: (value: string) => void;
  allLabel?: string;
}

export function SelectFilter({ label, value, options, onChange, allLabel = "All" }: SelectFilterProps) {
  return (
    <label className="select-filter">
      <span>{label}</span>
      <select aria-label={label} value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="">{allLabel}</option>
        {options.map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
    </label>
  );
}
