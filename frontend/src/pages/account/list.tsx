import { useState, useMemo, useCallback } from "react";
import Layout from "@/components/layout";
import { ListPageLayout } from "@/components/list-page-layout";
import { DataTable } from "@/components/data-table";
import type { TableColumn } from "@/components/data-table";
import { Badge } from "@/components/ui/badge";
import { CreateAccountDialog } from "@/pages/account/dialogs/create";
import { AccountEmptyState } from "@/pages/account/empty-state";
import { AccountDetailsPanel } from "@/pages/account/components/account-details-panel";
import {
  AccountFilterBar,
  type AccountFilters,
} from "@/pages/account/components/account-filter-bar";
import { Pagination, type PaginationInfo } from "@/components/ui/pagination";
import { $api } from "@/lib/api/client";
import type { components } from "@/lib/api/generated/api-types";
import { formatBalance } from "@/lib/currency";

type LedgerAccountResponse = components["schemas"]["LedgerAccountResponseDto"];

export function AccountList() {
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [filters, setFilters] = useState<AccountFilters>({
    search: "",
    ledgerId: "all",
    currency: "",
    normalBalance: "all",
  });

  // Pagination state
  const [pageSize, setPageSize] = useState(20);
  const [cursor, setCursor] = useState<string | undefined>(undefined);

  // Build query parameters from filters and pagination
  const queryParams = useMemo(() => {
    const params: Record<string, string | number> = {
      limit: pageSize,
    };

    if (cursor) params.cursor = cursor;
    if (filters.ledgerId && filters.ledgerId !== "all") params.ledger_id = filters.ledgerId;
    if (filters.currency) params.currency = filters.currency;
    if (filters.normalBalance && filters.normalBalance !== "all") {
      params.normal_balance = filters.normalBalance as "debit" | "credit";
    }
    if (filters.search.trim()) params.search = filters.search.trim();
    return params;
  }, [filters.ledgerId, filters.currency, filters.normalBalance, filters.search, pageSize, cursor]);

  const {
    data: accounts,
    isLoading,
    error,
  } = $api.useQuery("get", "/v1/ledger_accounts", {
    params: {
      query: queryParams,
    },
  });

  const handleRowClick = (account: LedgerAccountResponse) => {
    setSelectedAccountId(account.id);
    setIsPanelOpen(true);
  };

  const handlePanelClose = () => {
    setIsPanelOpen(false);
    setSelectedAccountId(null);
  };

  const displayedAccounts = accounts?.data ?? [];

  const paginationInfo: PaginationInfo = {
    hasNext: accounts?.hasNext ?? false,
    hasPrev: accounts?.hasPrev ?? false,
    nextCursor: accounts?.nextCursor,
    prevCursor: accounts?.prevCursor,
  };

  const handleFiltersChange = (newFilters: AccountFilters) => {
    const shouldResetPagination =
      newFilters.ledgerId !== filters.ledgerId ||
      newFilters.currency !== filters.currency ||
      newFilters.normalBalance !== filters.normalBalance ||
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
      currency: "",
      normalBalance: "all",
    });
    setCursor(undefined); // Reset to first page when clearing filters
  };

  // Pagination event handlers
  const handlePageSizeChange = useCallback((newPageSize: number) => {
    setPageSize(newPageSize);
    setCursor(undefined); // Reset to first page when changing page size
  }, []);

  const handleCursorChange = useCallback((newCursor: string | undefined) => {
    setCursor(newCursor);
  }, []);


  const columns: TableColumn<LedgerAccountResponse>[] = [
    {
      header: "Name",
      cell: (account) => <div className="font-medium">{account.name}</div>,
    },
    {
      header: "External ID",
      cell: (account) => <div>{account.externalId ?? "-"}</div>,
    },
    
    {
      header: "Currency",
      cell: (account) => (
        <Badge variant="outline">
          {account.balances.avalaibleBalance.currency}
        </Badge>
      ),
    },
    {
      header: "Normal Balance",
      cell: (account) => (
        <Badge
          variant={account.normalBalance === "debit" ? "default" : "secondary"}
        >
          {account.normalBalance.toUpperCase()}
        </Badge>
      ),
    },
    {
      header: "Posted Balance",
      cell: (account) => {
        const { amount, currency, currencyExponent } =
          account.balances.postedBalance;
        return (
          <div className="text-right font-mono">
            {formatBalance(amount, currency, currencyExponent)}
          </div>
        );
      },
      className: "text-right",
    },
    {
      header: "Pending Balance",
      cell: (account) => {
        const { amount, currency, currencyExponent } =
          account.balances.pendingBalance;
        return (
          <div className="text-right font-mono">
            {formatBalance(amount, currency, currencyExponent)}
          </div>
        );
      },
      className: "text-right",
    },
    {
      header: "Available Balance",
      cell: (account) => {
        const { amount, currency, currencyExponent } =
          account.balances.avalaibleBalance;
        return (
          <div className="text-right font-mono">
            {formatBalance(amount, currency, currencyExponent)}
          </div>
        );
      },
      className: "text-right",
    },
    {
      header: "Created",
      cell: (account) => (
        <div className="text-muted-foreground">
          {new Date(account.createdAt).toLocaleDateString()}
        </div>
      ),
    },
  ];

  return (
    <Layout>
      <ListPageLayout
        title="Accounts"
        description="Manage your ledger accounts and track balances"
        actionButton={<CreateAccountDialog />}
      >
        <div className="space-y-3">
          <AccountFilterBar
            filters={filters}
            onFiltersChange={handleFiltersChange}
            onClearFilters={handleClearFilters}
            resultCount={displayedAccounts.length}
          />
          <DataTable
            columns={columns}
            data={displayedAccounts}
            isLoading={isLoading}
            error={error}
            emptyState={<AccountEmptyState />}
            getRowKey={(account) => account.id}
            onRowClick={handleRowClick}
          />

          {/* Pagination Controls */}
          {!isLoading && accounts?.data && accounts.data.length > 0 && (
            <Pagination
              pageSize={pageSize}
              onPageSizeChange={handlePageSizeChange}
              paginationInfo={paginationInfo}
              onCursorChange={handleCursorChange}
              currentDataLength={displayedAccounts.length}
              disabled={isLoading}
            />
          )}
        </div>
        <AccountDetailsPanel
          accountId={selectedAccountId}
          isOpen={isPanelOpen}
          onClose={handlePanelClose}
        />
      </ListPageLayout>
    </Layout>
  );
}
