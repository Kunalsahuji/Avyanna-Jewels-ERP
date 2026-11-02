import React from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown
} from 'lucide-react';

/**
 * Enterprise-grade pagination controls matching Tvisha luxury theme
 */
export function DataTablePagination({
  page = 1,
  pages = 1,
  total = 0,
  limit = 20,
  onPageChange,
  onLimitChange,
}) {
  const fromRecord = total === 0 ? 0 : (page - 1) * limit + 1;
  const toRecord = Math.min(page * limit, total);

  // Compute smart visible page range (e.g. 1 ... 4 5 6 ... 12)
  const getPageNumbers = () => {
    const delta = 1;
    const range = [];
    const rangeWithDots = [];

    for (
      let i = Math.max(2, page - delta);
      i <= Math.min(pages - 1, page + delta);
      i++
    ) {
      range.push(i);
    }

    if (page - delta > 2) {
      rangeWithDots.push(1, '...');
    } else {
      rangeWithDots.push(1);
    }

    range.forEach((p) => {
      if (p !== 1 && p !== pages) {
        rangeWithDots.push(p);
      }
    });

    if (page + delta < pages - 1) {
      rangeWithDots.push('...', pages);
    } else if (pages > 1) {
      rangeWithDots.push(pages);
    }

    return rangeWithDots;
  };

  const pageNumbers = getPageNumbers();

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-3 px-2 border-t border-cream-200 text-xs text-walnut-700 select-none">
      {/* Left: Record Range & Limit Selector */}
      <div className="flex items-center gap-3">
        <span>
          Showing <span className="font-semibold text-walnut-950">{fromRecord}</span> to{' '}
          <span className="font-semibold text-walnut-950">{toRecord}</span> of{' '}
          <span className="font-semibold text-walnut-950">{total}</span> records
        </span>

        {onLimitChange && (
          <div className="flex items-center gap-1.5 ml-2">
            <span className="text-walnut-500">Rows:</span>
            <select
              value={limit}
              onChange={(e) => onLimitChange(Number(e.target.value))}
              className="bg-white border border-cream-300 rounded px-2 py-1 text-xs font-medium text-walnut-800 focus:outline-none focus:ring-1 focus:ring-gold-500"
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        )}
      </div>

      {/* Right: Page Navigation Controls */}
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(1)}
          disabled={page <= 1}
          title="First Page"
          className="p-1.5 rounded border border-cream-300 bg-white hover:bg-cream-100 disabled:opacity-40 disabled:cursor-not-allowed transition"
        >
          <ChevronsLeft className="h-3.5 w-3.5" />
        </button>

        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          title="Previous Page"
          className="p-1.5 rounded border border-cream-300 bg-white hover:bg-cream-100 disabled:opacity-40 disabled:cursor-not-allowed transition"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
        </button>

        {/* Page numbers */}
        <div className="flex items-center gap-1 mx-1">
          {pageNumbers.map((p, idx) => {
            if (p === '...') {
              return (
                <span key={`dots-${idx}`} className="px-1.5 text-walnut-400">
                  …
                </span>
              );
            }
            const isActive = p === page;
            return (
              <button
                key={p}
                onClick={() => onPageChange(p)}
                className={`min-w-[28px] h-7 px-2 rounded text-xs font-semibold transition ${
                  isActive
                    ? 'bg-gold-500 text-walnut-950 shadow-xs'
                    : 'bg-white border border-cream-300 text-walnut-700 hover:bg-cream-100'
                }`}
              >
                {p}
              </button>
            );
          })}
        </div>

        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page >= pages}
          title="Next Page"
          className="p-1.5 rounded border border-cream-300 bg-white hover:bg-cream-100 disabled:opacity-40 disabled:cursor-not-allowed transition"
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </button>

        <button
          onClick={() => onPageChange(pages)}
          disabled={page >= pages}
          title="Last Page"
          className="p-1.5 rounded border border-cream-300 bg-white hover:bg-cream-100 disabled:opacity-40 disabled:cursor-not-allowed transition"
        >
          <ChevronsRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

/**
 * Clickable, sortable table header component
 */
export function SortableHeader({
  field,
  currentSortBy,
  currentSortOrder = 'desc',
  onSort,
  children,
  className = '',
  align = 'left',
}) {
  const isCurrent = currentSortBy === field;
  const nextOrder = isCurrent && currentSortOrder === 'asc' ? 'desc' : 'asc';

  return (
    <th
      onClick={() => onSort(field, nextOrder)}
      className={`px-4 py-3 cursor-pointer select-none group transition hover:bg-white/10 ${
        align === 'center' ? 'text-center' : align === 'right' ? 'text-right' : 'text-left'
      } ${className}`}
    >
      <div
        className={`inline-flex items-center gap-1.5 font-semibold ${
          align === 'center'
            ? 'justify-center'
            : align === 'right'
            ? 'justify-end'
            : 'justify-start'
        }`}
      >
        <span>{children}</span>
        <span
          className={`transition ${
            isCurrent ? 'text-gold-400 opacity-100' : 'text-cream-200/40 opacity-0 group-hover:opacity-75'
          }`}
        >
          {isCurrent ? (
            currentSortOrder === 'asc' ? (
              <ArrowUp className="h-3 w-3" />
            ) : (
              <ArrowDown className="h-3 w-3" />
            )
          ) : (
            <ArrowUpDown className="h-3 w-3" />
          )}
        </span>
      </div>
    </th>
  );
}
