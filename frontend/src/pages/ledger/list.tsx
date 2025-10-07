import Layout from "@/components/layout";
import { ListPageLayout } from "@/components/list-page-layout";
import { DataTable } from "@/components/data-table";
import type { TableColumn } from "@/components/data-table";
import { CreateLedgerDialog } from "@/pages/ledger/dialogs/create";
import { EditLedgerDialog } from "@/pages/ledger/dialogs/edit";
import { LedgerEmptyState } from "@/pages/ledger/empty-state";
import { $api } from "@/lib/api/client";
import { formatDate } from "@/lib/date";
import type { components } from "@/lib/api/generated/api-types";

type LedgerResponse = components["schemas"]["LedgerResponseDto"];

export function LedgerList() {
  const {
    data: ledgers,
    isLoading,
    error,
  } = $api.useQuery("get", "/v1/ledgers");

  const columns: TableColumn<LedgerResponse>[] = [
    {
      header: "Name",
      cell: (ledger) => <div className="font-medium">{ledger.name}</div>,
    },
    {
      header: "Description",
      cell: (ledger) => (
        <div className="text-muted-foreground">
          {ledger.description || "No description"}
        </div>
      ),
    },
    {
      header: "Created",
      cell: (ledger) => (
        <div className="text-muted-foreground">
          {formatDate(ledger.createdAt)}
        </div>
      ),
    },
    {
      header: "Actions",
      cell: (ledger) => <EditLedgerDialog ledger={ledger} />,
      className: "text-right",
    },
  ];

  return (
    <Layout>
      <ListPageLayout
        title="Ledgers"
        description="Manage your financial ledgers and accounting records"
        actionButton={<CreateLedgerDialog />}
      >
        <DataTable
          columns={columns}
          data={ledgers?.data}
          isLoading={isLoading}
          error={error}
          emptyState={<LedgerEmptyState />}
          getRowKey={(ledger) => ledger.id}
        />
      </ListPageLayout>
    </Layout>
  );
}
