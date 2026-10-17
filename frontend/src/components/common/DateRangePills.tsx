interface DateRangePillsProps {
  value: number;
  onChange: (days: number) => void;
  options?: readonly number[];
}

export function DateRangePills({ value, onChange, options = [7, 14, 30] }: DateRangePillsProps) {
  return (
    <div className="date-range-pills" role="group" aria-label="Date range">
      {options.map((days) => (
        <button key={days} type="button" aria-pressed={days === value} onClick={() => onChange(days)}>{days}d</button>
      ))}
    </div>
  );
}
