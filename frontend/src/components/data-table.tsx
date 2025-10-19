import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ReactNode } from "react";

export interface TableColumn<T> {
  header: string;
  accessor?: keyof T;
  cell?: (item: T) => ReactNode;
  className?: string;
  sticky?: "left" | "right";
}

interface DataTableProps<T> {
  columns: TableColumn<T>[];
  data: T[] | undefined;
  isLoading?: boolean;
  error?: unknown;
  emptyState?: ReactNode;
  getRowKey: (item: T) => string;
  onRowClick?: (item: T) => void;
}

export function DataTable<T>({
  columns,
  data,
  isLoading,
  error,
  emptyState,
  getRowKey,
  onRowClick,
}: DataTableProps<T>) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="text-center">
          <p className="text-destructive mb-2">Failed to load data</p>
          <p className="text-sm text-muted-foreground">
            An error occurred while fetching data
          </p>
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      emptyState || (
        <div className="flex items-center justify-center py-24">
          <div className="text-muted-foreground">No data available</div>
        </div>
      )
    );
  }

  const getStickyClassName = (sticky?: "left" | "right") => {
    if (!sticky) return "";

    const baseClasses = "sticky z-10 bg-background";
    const positionClass = sticky === "left" ? "left-0" : "right-0";

    return `${baseClasses} ${positionClass}`;
  };

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((column, index) => (
              <TableHead
                key={index}
                className={`${column.className || ""} ${getStickyClassName(
                  column.sticky
                )}`.trim()}
              >
                {column.header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((item) => (
            <TableRow
              key={getRowKey(item)}
              className={
                onRowClick ? "cursor-pointer hover:bg-muted/50" : undefined
              }
              onClick={onRowClick ? () => onRowClick(item) : undefined}
            >
              {columns.map((column, index) => (
                <TableCell
                  key={index}
                  className={`${column.className || ""} ${getStickyClassName(
                    column.sticky
                  )}`.trim()}
                >
                  {column.cell
                    ? column.cell(item)
                    : column.accessor
                    ? String(item[column.accessor])
                    : null}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
