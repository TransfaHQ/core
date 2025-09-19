import Layout from "@/components/layout";
import { CreateLedgerDialog } from "@/components/create-ledger-dialog";
import { EmptyState } from "@/components/empty-state";
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

          {!isLoading && !error && ledgers?.data && ledgers.data.length === 0 && (
            <EmptyState />
          )}

          {!isLoading && !error && ledgers?.data && ledgers.data.length > 0 && (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {ledgers.data.map((ledger) => (
                <div
                  key={ledger.id}
                  className="rounded-lg border bg-card text-card-foreground shadow-sm p-6"
                >
                  <div className="space-y-2">
                    <h3 className="font-semibold leading-none tracking-tight">
                      {ledger.name}
                    </h3>
                    {ledger.description && (
                      <p className="text-sm text-muted-foreground">
                        {ledger.description}
                      </p>
                    )}
                    <div className="text-xs text-muted-foreground">
                      Created {new Date(ledger.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}