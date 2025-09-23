import { useState, useMemo } from "react";
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

  // Build query parameters from filters
  const queryParams = useMemo(() => {
    const params: any = {};
    if (filters.ledgerId && filters.ledgerId !== "all") params.ledger_id = filters.ledgerId;
    if (filters.currency) params.currency = filters.currency;
    if (filters.normalBalance && filters.normalBalance !== "all") {
      params.normal_balance = filters.normalBalance as "debit" | "credit";
    }
    return params;
  }, [filters.ledgerId, filters.currency, filters.normalBalance]);

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

  // Filter accounts client-side by search term
  const filteredAccounts = useMemo(() => {
    if (!accounts?.data) return [];

    if (!filters.search.trim()) {
      return accounts.data;
    }

    const searchTerm = filters.search.toLowerCase().trim();
    return accounts.data.filter((account) =>
      account.name.toLowerCase().includes(searchTerm) ||
      account.description?.toLowerCase().includes(searchTerm) ||
      account.externalId?.toLowerCase().includes(searchTerm)
    );
  }, [accounts?.data, filters.search]);

  const handleFiltersChange = (newFilters: AccountFilters) => {
    setFilters(newFilters);
  };

  const handleClearFilters = () => {
    setFilters({
      search: "",
      ledgerId: "all",
      currency: "",
      normalBalance: "all",
    });
  };


  const columns: TableColumn<LedgerAccountResponse>[] = [
    {
      header: "Name",
      cell: (account) => <div className="font-medium">{account.name}</div>,
    },
    {
      header: "Description",
      cell: (account) => (
        <div className="text-muted-foreground">
          {account.description || "No description"}
        </div>
      ),
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
        <div className="space-y-6">
          <AccountFilterBar
            filters={filters}
            onFiltersChange={handleFiltersChange}
            onClearFilters={handleClearFilters}
            resultCount={filteredAccounts.length}
          />
          <DataTable
            columns={columns}
            data={filteredAccounts}
            isLoading={isLoading}
            error={error}
            emptyState={<AccountEmptyState />}
            getRowKey={(account) => account.id}
            onRowClick={handleRowClick}
          />
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
