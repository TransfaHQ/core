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
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { $api } from "@/lib/api/client";
import type { EntryFilters } from "./entry-filter-bar";

interface EntryFilterModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filters: EntryFilters;
  onFiltersChange: (filters: EntryFilters) => void;
  onClearFilters: () => void;
}

export function EntryFilterModal({
  open,
  onOpenChange,
  filters,
  onFiltersChange,
  onClearFilters,
}: EntryFilterModalProps) {
  const [modalFilters, setModalFilters] = useState<EntryFilters>({
    search: filters.search,
    ledgerId: filters.ledgerId,
    accountId: filters.accountId,
    transactionExternalId: filters.transactionExternalId,
    direction: filters.direction,
  });

  const { data: ledgers } = $api.useQuery("get", "/v1/ledgers");
  const { data: accounts } = $api.useQuery("get", "/v1/ledger_accounts", {
    params: {
      query: {
        limit: 100,
      },
    },
  });

  // Update modal filters when parent filters change or modal opens
  useEffect(() => {
    if (open) {
      setModalFilters(filters);
    }
  }, [open, filters]);

  const handleModalFilterChange = <K extends keyof EntryFilters>(
    key: K,
    value: EntryFilters[K]
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
      accountId: "all",
      transactionExternalId: "",
      direction: "all" as const,
    };
    setModalFilters(clearedFilters);
    onFiltersChange(clearedFilters);
    onClearFilters();
    onOpenChange(false);
  };

  const getNonSearchFiltersCount = () => {
    let count = 0;
    if (modalFilters.ledgerId && modalFilters.ledgerId !== "all") count++;
    if (modalFilters.accountId && modalFilters.accountId !== "all") count++;
    if (modalFilters.transactionExternalId) count++;
    if (modalFilters.direction && modalFilters.direction !== "all") count++;
    return count;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Filter Entries</DialogTitle>
          <DialogDescription>
            Apply filters to narrow down your entry list
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

          {/* Account Filter */}
          <div className="space-y-2">
            <Label htmlFor="account">Account</Label>
            <Select
              value={modalFilters.accountId}
              onValueChange={(value) => handleModalFilterChange("accountId", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="All accounts" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All accounts</SelectItem>
                {accounts?.data?.map((account) => (
                  <SelectItem key={account.id} value={account.id}>
                    {account.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Transaction External ID Filter */}
          <div className="space-y-2">
            <Label htmlFor="transactionExternalId">Transaction External ID</Label>
            <Input
              id="transactionExternalId"
              placeholder="Filter by transaction external ID"
              value={modalFilters.transactionExternalId}
              onChange={(e) => handleModalFilterChange("transactionExternalId", e.target.value)}
            />
          </div>

          {/* Direction Filter */}
          <div className="space-y-2">
            <Label htmlFor="direction">Direction</Label>
            <Select
              value={modalFilters.direction}
              onValueChange={(value) => handleModalFilterChange("direction", value)}
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
