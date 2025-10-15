import type { TableColumn } from "@/components/data-table";
import { DataTable } from "@/components/data-table";
import Layout from "@/components/layout";
import { ListPageLayout } from "@/components/list-page-layout";
import { Badge } from "@/components/ui/badge";
import { Pagination, type PaginationInfo } from "@/components/ui/pagination";
import { $api } from "@/lib/api/client";
import { formatBalance } from "@/lib/currency";
import { formatDateTime } from "@/lib/date";
import {
  EntryFilterBar,
  type EntryFilters,
} from "@/pages/entry/components/entry-filter-bar";
import { EntryEmptyState } from "@/pages/entry/empty-state";
import { CreateTransactionSheet } from "@/pages/entry/sheets/create-transaction";
import { TransactionDetailsSheet } from "@/pages/entry/sheets/transaction-details";
import { useCallback, useMemo, useState } from "react";

export function EntryList() {
  const [filters, setFilters] = useState<EntryFilters>({
    search: "",
    ledgerId: "all",
    accountId: "all",
    transactionExternalId: "",
    direction: "all",
  });

  // Pagination state
  const [pageSize, setPageSize] = useState(20);
  const [cursor, setCursor] = useState<string | undefined>(undefined);

  // Transaction details sheet state
  const [selectedTransactionId, setSelectedTransactionId] = useState<
    string | null
  >(null);
  const [isDetailsSheetOpen, setIsDetailsSheetOpen] = useState(false);

  // Build query parameters from filters and pagination
  const queryParams = useMemo(() => {
    const params: Record<string, string | number> = {
      limit: pageSize,
    };

    if (cursor) params.cursor = cursor;
    if (filters.ledgerId && filters.ledgerId !== "all")
      params.ledgerId = filters.ledgerId;
    if (filters.accountId && filters.accountId !== "all")
      params.accountId = filters.accountId;
    if (filters.transactionExternalId)
      params.transactionExternalId = filters.transactionExternalId;
    if (filters.direction && filters.direction !== "all") {
      params.balanceDirection = filters.direction as "debit" | "credit";
    }
    return params;
  }, [
    filters.ledgerId,
    filters.accountId,
    filters.transactionExternalId,
    filters.direction,
    pageSize,
    cursor,
  ]);

  // Fetch entries using the API client
  const {
    data: entries,
    isLoading,
    error,
  } = $api.useQuery("get", "/v1/ledger_entries", {
    params: {
      query: queryParams,
    },
  });
  const displayedEntries = entries?.data ?? [];

  const paginationInfo: PaginationInfo = {
    hasNext: entries?.hasNext ?? false,
    hasPrev: entries?.hasPrev ?? false,
    nextCursor: entries?.nextCursor,
    prevCursor: entries?.prevCursor,
  };

  const handleFiltersChange = (newFilters: EntryFilters) => {
    const shouldResetPagination =
      newFilters.ledgerId !== filters.ledgerId ||
      newFilters.accountId !== filters.accountId ||
      newFilters.transactionExternalId !== filters.transactionExternalId ||
      newFilters.direction !== filters.direction ||
      newFilters.search !== filters.search;

    if (shouldResetPagination) {
      setCursor(undefined);
    }

    setFilters(newFilters);
  };

  const handleClearFilters = () => {
    setFilters({
      search: "",
      ledgerId: "all",
      accountId: "all",
      transactionExternalId: "",
      direction: "all",
    });
    setCursor(undefined);
  };

  // Pagination event handlers
  const handlePageSizeChange = useCallback((newPageSize: number) => {
    setPageSize(newPageSize);
    setCursor(undefined);
  }, []);

  const handleCursorChange = useCallback((newCursor: string | undefined) => {
    setCursor(newCursor);
  }, []);

  // Handle row click to open transaction details
  const handleRowClick = useCallback(
    (entry: (typeof displayedEntries)[number]) => {
      setSelectedTransactionId(entry.ledgerTransaction.id);
      setIsDetailsSheetOpen(true);
    },
    []
  );

  const columns: TableColumn<(typeof displayedEntries)[number]>[] = [
    {
      header: "Transaction",
      cell: (entry) => (
        <div className="text-sm font-mono text-muted-foreground truncate max-w-[200px]">
          {entry.ledgerTransaction.externalId}
        </div>
      ),
    },
    {
      header: "Status",
      cell: (entry) => (
        <Badge variant={"outline"}>{entry.status.toUpperCase()}</Badge>
      ),
    },
    {
      header: "Account",
      cell: (entry) => (
        <div className="text-sm truncate max-w-[200px]">
          {entry.ledgerAccount.name}
        </div>
      ),
    },

    {
      header: "Direction",
      cell: (entry) => (
        <Badge variant={entry.direction === "debit" ? "default" : "secondary"}>
          {entry.direction.toUpperCase()}
        </Badge>
      ),
    },
    {
      header: "Amount",
      cell: (entry) => {
        return (
          <div className="text-right font-mono">
            {formatBalance(
              entry.amount,
              entry.currency.code,
              entry.currency.exponent
            )}
          </div>
        );
      },
      className: "text-right",
    },
    {
      header: "Currency",
      cell: (entry) => <Badge variant="outline">{entry.currency.code}</Badge>,
    },
    {
      header: "Created",
      cell: (entry) => (
        <div className="text-muted-foreground">
          {formatDateTime(entry.createdAt)}
        </div>
      ),
    },
  ];

  return (
    <Layout>
      <ListPageLayout
        title="Movements"
        description="View all money movements across accounts and transactions"
        actionButton={<CreateTransactionSheet />}
      >
        <div className="space-y-3">
          <EntryFilterBar
            filters={filters}
            onFiltersChange={handleFiltersChange}
            onClearFilters={handleClearFilters}
            resultCount={displayedEntries.length}
          />
          <DataTable
            columns={columns}
            data={displayedEntries}
            isLoading={isLoading}
            error={error}
            emptyState={<EntryEmptyState />}
            getRowKey={(entry) => entry.id}
            onRowClick={handleRowClick}
          />

          {/* Pagination Controls */}
          {!isLoading && entries?.data && entries.data.length > 0 && (
            <Pagination
              pageSize={pageSize}
              onPageSizeChange={handlePageSizeChange}
              paginationInfo={paginationInfo}
              onCursorChange={handleCursorChange}
              currentDataLength={displayedEntries.length}
              disabled={isLoading}
            />
          )}
        </div>
      </ListPageLayout>

      <TransactionDetailsSheet
        transactionId={selectedTransactionId}
        open={isDetailsSheetOpen}
        onOpenChange={setIsDetailsSheetOpen}
      />
    </Layout>
  );
}
