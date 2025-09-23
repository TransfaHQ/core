import { useState } from "react";
import { Search, SlidersHorizontal } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AccountFilterModal } from "./account-filter-modal";

export interface AccountFilters {
  search: string;
  ledgerId: string; // 'all' for no filter, or actual ledger ID
  currency: string; // empty string for no filter, or actual currency code
  normalBalance: string; // 'all', 'debit', 'credit'
}

interface AccountFilterBarProps {
  filters: AccountFilters;
  onFiltersChange: (filters: AccountFilters) => void;
  onClearFilters: () => void;
  resultCount?: number;
}

export function AccountFilterBar({
  filters,
  onFiltersChange,
  onClearFilters,
  resultCount,
}: AccountFilterBarProps) {
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
    if (filters.currency) count++;
    if (filters.normalBalance && filters.normalBalance !== "all") count++;
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
              placeholder="Search accounts by name, description, or external ID"
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
      <AccountFilterModal
        open={isFilterModalOpen}
        onOpenChange={setIsFilterModalOpen}
        filters={filters}
        onFiltersChange={onFiltersChange}
        onClearFilters={onClearFilters}
      />
    </>
  );
}