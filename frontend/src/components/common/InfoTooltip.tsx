import { CircleHelp } from "lucide-react";

interface InfoTooltipProps {
  label: string;
  content: string;
}

export function InfoTooltip({ label, content }: InfoTooltipProps) {
  return (
    <button className="tooltip-trigger" type="button" aria-label={`${label}: ${content}`} title={content}>
      <CircleHelp aria-hidden="true" />
    </button>
  );
}
