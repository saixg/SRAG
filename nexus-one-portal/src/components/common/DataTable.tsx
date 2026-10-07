import React from 'react';
import { clsx } from 'clsx';
import { Skeleton } from './Skeleton';

export interface Column<T> {
  key: string;
  header: string;
  render?: (item: T) => React.ReactNode;
  className?: string;
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  isLoading?: boolean;
  emptyMessage?: string;
  onRowClick?: (item: T) => void;
  className?: string;
}

export function DataTable<T extends { id?: string | number }>({
  columns,
  data,
  isLoading = false,
  emptyMessage = 'No records found.',
  onRowClick,
  className
}: DataTableProps<T>) {
  if (isLoading) {
    return (
      <div className="border border-[#22375F] rounded-2xl overflow-hidden bg-[#111A2E]/80 p-4 space-y-3">
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    );
  }

  return (
    <div className={clsx("border border-[#22375F] rounded-2xl overflow-hidden bg-[#111A2E]/90 shadow-lg", className)}>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-[#15223D] text-xs font-semibold text-slate-300 uppercase tracking-wider border-b border-[#22375F]">
            <tr>
              {columns.map((col) => (
                <th key={col.key} className={clsx("px-4 py-3.5", col.className)}>
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#22375F]/80">
            {data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-6 py-10 text-center text-slate-400 text-sm">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((item, index) => {
                const key = item.id ? String(item.id) : index;
                return (
                  <tr
                    key={key}
                    onClick={() => onRowClick?.(item)}
                    className={clsx(
                      "transition-colors",
                      onRowClick
                        ? "hover:bg-[#15223D]/70 cursor-pointer"
                        : "hover:bg-slate-900/30"
                    )}
                  >
                    {columns.map((col) => (
                      <td key={col.key} className={clsx("px-4 py-3 text-slate-200", col.className)}>
                        {col.render ? col.render(item) : (item as any)[col.key]}
                      </td>
                    ))}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
