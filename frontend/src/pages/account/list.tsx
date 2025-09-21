import Layout from "@/components/layout";
import { ListPageLayout } from "@/components/list-page-layout";
import { DataTable } from "@/components/data-table";
import type { TableColumn } from "@/components/data-table";
import { Badge } from "@/components/ui/badge";
import { CreateAccountDialog } from "@/pages/account/dialogs/create";
import { EditAccountDialog } from "@/pages/account/dialogs/edit";
import { AccountEmptyState } from "@/pages/account/empty-state";
import { $api } from "@/lib/api/client";
import type { components } from "@/lib/api/generated/api-types";

type LedgerAccountResponse = components["schemas"]["LedgerAccountResponseDto"];

export function AccountList() {
  const {
    data: accounts,
    isLoading,
    error,
  } = $api.useQuery("get", "/v1/ledger_accounts");

  const formatBalance = (
    balance: number,
    currency: string,
    exponent: number
  ) => {
    const amount = balance / Math.pow(10, exponent);
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency,
      minimumFractionDigits: exponent,
      maximumFractionDigits: exponent,
    }).format(amount);
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
    {
      header: "Actions",
      cell: (account) => <EditAccountDialog account={account} />,
      className: "text-right",
    },
  ];

  return (
    <Layout>
      <ListPageLayout
        title="Accounts"
        description="Manage your ledger accounts and track balances"
        actionButton={<CreateAccountDialog />}
      >
        <DataTable
          columns={columns}
          data={accounts?.data}
          isLoading={isLoading}
          error={error}
          emptyState={<AccountEmptyState />}
          getRowKey={(account) => account.id}
        />
      </ListPageLayout>
    </Layout>
  );
}
