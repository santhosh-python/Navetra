import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './Button';

interface PaginationProps {
  page: number;
  pageSize: number;
  totalItems: number;
  pageSizeOptions?: number[];
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}

export function Pagination({ page, pageSize, totalItems, pageSizeOptions = [10, 25, 50], onPageChange, onPageSizeChange }: PaginationProps) {
  const pageCount = Math.max(1, Math.ceil(totalItems / pageSize));
  const first = totalItems === 0 ? 0 : (page - 1) * pageSize + 1;
  const last = Math.min(totalItems, page * pageSize);
  return (
    <nav className="pagination" aria-label="Table pagination">
      <div className="row">
        <label htmlFor="page-size">Rows per page</label>
        <select id="page-size" className="select" style={{ width: 84, minHeight: 30, height: 30 }} value={pageSize} onChange={(event) => onPageSizeChange(Number(event.target.value))}>
          {pageSizeOptions.map((size) => (
            <option key={size} value={size}>
              {size}
            </option>
          ))}
        </select>
        <span className="num">
          {first}–{last} of {totalItems}
        </span>
      </div>
      <div className="pagination__controls">
        <Button size="sm" variant="ghost" iconOnly aria-label="Previous page" disabled={page <= 1} onClick={() => onPageChange(page - 1)} icon={<ChevronLeft size={16} aria-hidden="true" />} />
        <span className="num" aria-live="polite">
          Page {page} of {pageCount}
        </span>
        <Button size="sm" variant="ghost" iconOnly aria-label="Next page" disabled={page >= pageCount} onClick={() => onPageChange(page + 1)} icon={<ChevronRight size={16} aria-hidden="true" />} />
      </div>
    </nav>
  );
}
