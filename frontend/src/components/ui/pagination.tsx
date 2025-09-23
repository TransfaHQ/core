import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface PaginationInfo {
  hasNext: boolean;
  hasPrev: boolean;
  nextCursor?: string;
  prevCursor?: string;
}

interface PaginationProps {
  /** Current page size */
  pageSize: number;
  /** Function to handle page size changes */
  onPageSizeChange: (pageSize: number) => void;
  /** Pagination information from API */
  paginationInfo: PaginationInfo;
  /** Function to handle cursor navigation */
  onCursorChange: (cursor: string | undefined, direction: 'next' | 'prev') => void;
  /** Current data length for displaying range */
  currentDataLength: number;
  /** Total count if available (for display purposes) */
  totalCount?: number;
  /** Whether pagination is disabled (during loading) */
  disabled?: boolean;
  /** Show page size selector */
  showPageSize?: boolean;
}

const PAGE_SIZE_OPTIONS = [
  { value: 10, label: "10 per page" },
  { value: 20, label: "20 per page" },
  { value: 50, label: "50 per page" },
  { value: 100, label: "100 per page" },
];

export function Pagination({
  pageSize,
  onPageSizeChange,
  paginationInfo,
  onCursorChange,
  currentDataLength,
  totalCount,
  disabled = false,
  showPageSize = true,
}: PaginationProps) {
  const { hasNext, hasPrev, nextCursor, prevCursor } = paginationInfo;

  const handlePrevious = () => {
    if (hasPrev && prevCursor !== undefined) {
      onCursorChange(prevCursor, 'prev');
    }
  };

  const handleNext = () => {
    if (hasNext && nextCursor !== undefined) {
      onCursorChange(nextCursor, 'next');
    }
  };

  const handlePageSizeChange = (value: string) => {
    onPageSizeChange(parseInt(value, 10));
  };

  // Show range info
  const showingCount = currentDataLength;
  const hasData = showingCount > 0;

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
      {/* Results info */}
      <div className="text-sm text-muted-foreground">
        {hasData ? (
          <>
            Showing {showingCount} result{showingCount !== 1 ? "s" : ""}
            {totalCount && ` of ${totalCount.toLocaleString()}`}
          </>
        ) : (
          "No results found"
        )}
      </div>

      {/* Pagination controls */}
      <div className="flex items-center gap-4">
        {/* Page size selector */}
        {showPageSize && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Show:</span>
            <Select
              value={pageSize.toString()}
              onValueChange={handlePageSizeChange}
              disabled={disabled}
            >
              <SelectTrigger className="h-8 w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAGE_SIZE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value.toString()}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Navigation buttons */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrevious}
            disabled={disabled || !hasPrev}
            className="h-8 px-3"
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Previous
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleNext}
            disabled={disabled || !hasNext}
            className="h-8 px-3"
          >
            Next
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </div>
    </div>
  );
}