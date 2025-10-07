import { useState } from "react";
import { Search, SlidersHorizontal } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EntryFilterModal } from "./entry-filter-modal";

export interface EntryFilters {
  search: string;
  ledgerId: string; // 'all' for no filter, or actual ledger ID
  accountId: string; // empty string for no filter, or actual account ID
  transactionExternalId: string; // empty string for no filter
  direction: string; // 'all', 'debit', 'credit'
}

interface EntryFilterBarProps {
  filters: EntryFilters;
  onFiltersChange: (filters: EntryFilters) => void;
  onClearFilters: () => void;
  resultCount?: number;
}

export function EntryFilterBar({
  filters,
  onFiltersChange,
  onClearFilters,
  resultCount,
}: EntryFilterBarProps) {
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);

  const handleSearchChange = (value: string) => {
    onFiltersChange({
      ...filters,
      search: value,
    });
  };

  const getNonSearchFiltersCount = () => {
    let count = 0;
    if (filters.ledgerId && filters.ledgerId !== "all") count++;
    if (filters.accountId && filters.accountId !== "all") count++;
    if (filters.transactionExternalId) count++;
    if (filters.direction && filters.direction !== "all") count++;
    return count;
  };

  const nonSearchFiltersCount = getNonSearchFiltersCount();

  return (
    <>
      <div className="flex flex-col sm:flex-row gap-2 rounded-lg sm:justify-between">
        {/* Search Input */}
        <div className="flex-1 w-full max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 text-muted-foreground -translate-y-1/2" />
            <Input
              placeholder="Search entries by account or transaction"
              value={filters.search}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {/* Filter Button */}
        <div className="flex items-center gap-3 self-end">
          {/* Result Count */}
          {typeof resultCount === "number" && (
            <span className="text-sm text-muted-foreground whitespace-nowrap">
              {resultCount} result{resultCount !== 1 ? "s" : ""}
            </span>
          )}

          {/* Filter Button */}
          <Button
            variant="outline"
            onClick={() => setIsFilterModalOpen(true)}
            className="relative whitespace-nowrap"
          >
            <SlidersHorizontal className="h-4 w-4 mr-2" />
            Filters
            {nonSearchFiltersCount > 0 && (
              <Badge
                variant="destructive"
                className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
              >
                {nonSearchFiltersCount}
              </Badge>
            )}
          </Button>
        </div>
      </div>

      {/* Filter Modal */}
      <EntryFilterModal
        open={isFilterModalOpen}
        onOpenChange={setIsFilterModalOpen}
        filters={filters}
        onFiltersChange={onFiltersChange}
        onClearFilters={onClearFilters}
      />
    </>
  );
}
