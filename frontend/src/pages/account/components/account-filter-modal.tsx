import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CurrencyCombobox } from "@/components/currency-combobox";
import { $api } from "@/lib/api/client";
import type { AccountFilters } from "./account-filter-bar";

interface AccountFilterModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filters: AccountFilters;
  onFiltersChange: (filters: AccountFilters) => void;
  onClearFilters: () => void;
}

export function AccountFilterModal({
  open,
  onOpenChange,
  filters,
  onFiltersChange,
  onClearFilters,
}: AccountFilterModalProps) {
  const [modalFilters, setModalFilters] = useState<AccountFilters>({
    search: filters.search,
    ledgerId: filters.ledgerId,
    currency: filters.currency,
    normalBalance: filters.normalBalance,
  });

  const { data: ledgers } = $api.useQuery("get", "/v1/ledgers");

  // Update modal filters when parent filters change or modal opens
  useEffect(() => {
    if (open) {
      setModalFilters(filters);
    }
  }, [open, filters]);

  const handleModalFilterChange = <K extends keyof AccountFilters>(
    key: K,
    value: AccountFilters[K]
  ) => {
    setModalFilters(prev => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleApplyFilters = () => {
    onFiltersChange(modalFilters);
    onOpenChange(false);
  };

  const handleClearAll = () => {
    const clearedFilters = {
      search: filters.search, // Keep search as it's handled outside modal
      ledgerId: "all",
      currency: "",
      normalBalance: "all" as const,
    };
    setModalFilters(clearedFilters);
    onFiltersChange(clearedFilters);
    onClearFilters();
    onOpenChange(false);
  };

  const getNonSearchFiltersCount = () => {
    let count = 0;
    if (modalFilters.ledgerId && modalFilters.ledgerId !== "all") count++;
    if (modalFilters.currency) count++;
    if (modalFilters.normalBalance && modalFilters.normalBalance !== "all") count++;
    return count;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Filter Accounts</DialogTitle>
          <DialogDescription>
            Apply filters to narrow down your account list
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Ledger Filter */}
          <div className="space-y-2">
            <Label htmlFor="ledger">Ledger</Label>
            <Select
              value={modalFilters.ledgerId}
              onValueChange={(value) => handleModalFilterChange("ledgerId", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="All ledgers" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All ledgers</SelectItem>
                {ledgers?.data?.map((ledger) => (
                  <SelectItem key={ledger.id} value={ledger.id}>
                    {ledger.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Currency Filter */}
          <div className="space-y-2">
            <Label htmlFor="currency">Currency</Label>
            <CurrencyCombobox
              value={modalFilters.currency}
              onValueChange={(value) => handleModalFilterChange("currency", value)}
              placeholder="All currencies"
            />
          </div>

          {/* Normal Balance Filter */}
          <div className="space-y-2">
            <Label htmlFor="normalBalance">Normal Balance</Label>
            <Select
              value={modalFilters.normalBalance}
              onValueChange={(value) => handleModalFilterChange("normalBalance", value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="debit">Debit</SelectItem>
                <SelectItem value="credit">Credit</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter className="flex justify-between">
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleClearAll}>
              Clear All
            </Button>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleApplyFilters}>
              Apply Filters
              {getNonSearchFiltersCount() > 0 && (
                <span className="ml-2 bg-primary-foreground text-primary rounded-full px-2 py-0.5 text-xs">
                  {getNonSearchFiltersCount()}
                </span>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}