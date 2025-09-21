import Layout from "@/components/layout";
import { CreateLedgerDialog } from "@/pages/ledger/dialogs/create";
import { EditLedgerDialog } from "@/pages/ledger/dialogs/edit";
import { EmptyState } from "@/components/empty-state";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { $api } from "@/lib/api/client";

export function LedgerList() {
  const {
    data: ledgers,
    isLoading,
    error,
  } = $api.useQuery("get", "/v1/ledgers");

  return (
    <Layout>
      <div className="flex-1 space-y-4 p-8 pt-6 w-full">
        {/* Page Header */}
        <div className="flex items-center justify-between w-full">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Ledgers</h1>
            <p className="text-muted-foreground">
              Manage your financial ledgers and accounting records
            </p>
          </div>
          <CreateLedgerDialog />
        </div>

        {/* Content */}
        <div className="space-y-4">
          {isLoading && (
            <div className="flex items-center justify-center py-24">
              <div className="text-muted-foreground">Loading ledgers...</div>
            </div>
          )}

          {error && (
            <div className="flex items-center justify-center py-24">
              <div className="text-center">
                <p className="text-destructive mb-2">Failed to load ledgers</p>
                <p className="text-sm text-muted-foreground">
                  An error occurred while fetching ledgers
                </p>
              </div>
            </div>
          )}

          {!isLoading &&
            !error &&
            ledgers?.data &&
            ledgers.data.length === 0 && <EmptyState />}

          {!isLoading && !error && ledgers?.data && ledgers.data.length > 0 && (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ledgers.data.map((ledger) => (
                    <TableRow key={ledger.id}>
                      <TableCell className="font-medium">
                        {ledger.name}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {ledger.description || "No description"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(ledger.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <EditLedgerDialog ledger={ledger} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
