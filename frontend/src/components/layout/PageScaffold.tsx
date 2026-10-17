import type { ReactNode } from "react";
import { PageHeader } from "./PageHeader";

interface PageScaffoldProps {
  title: string;
  description: string;
  children?: ReactNode;
}

export function PageScaffold({ title, description, children }: PageScaffoldProps) {
  return (
    <section className="page-content" aria-labelledby="page-title">
      <PageHeader title={title} description={description} />
      {children ?? (
        <aside className="foundation-notice" aria-label="Foundation status">
          <strong>Starter route</strong>
          <p>
            Navigation and page boundaries are in place. The detailed interface for this area
            will be added in the next design stage.
          </p>
        </aside>
      )}
    </section>
  );
}
