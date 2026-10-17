import { Link } from 'react-router-dom';
import { PageHeader } from '../components/layout/PageHeader';
import { SectionCard } from '../components/common/SectionCard';
import { EmptyState } from '../components/common/EmptyState';
import { buttonClasses } from '../components/common/Button';

export function NotFoundPage() {
  return (
    <>
      <PageHeader title="Page not found" />
      <SectionCard>
        <EmptyState title="This page does not exist" description="Check the address, or use the navigation to find the page you need." action={<Link className={buttonClasses({ variant: 'primary' })} to="/">Go to overview</Link>} />
      </SectionCard>
    </>
  );
}
