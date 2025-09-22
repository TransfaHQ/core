import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EditAccountDialog } from "@/pages/account/dialogs/edit";
import { $api } from "@/lib/api/client";
import type { components } from "@/lib/api/generated/api-types";

type LedgerAccountResponse = components["schemas"]["LedgerAccountResponseDto"];

interface AccountDetailsPanelProps {
  accountId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

export function AccountDetailsPanel({
  accountId,
  isOpen,
  onClose,
}: AccountDetailsPanelProps) {
  const {
    data: account,
    isLoading,
    error,
  } = $api.useQuery("get", "/v1/ledger_accounts/{id}", {
    params: {
      path: { id: accountId || "" },
    },
  }, {
    enabled: !!accountId && isOpen,
  });

  if (!accountId) return null;

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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="max-w-[400px] sm:max-w-[540px]">
        {isLoading ? (
          <div className="flex items-center justify-center py-24">
            <div className="text-muted-foreground">Loading account details...</div>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center py-24">
            <div className="text-center">
              <p className="text-destructive mb-2">Failed to load account details</p>
              <p className="text-sm text-muted-foreground">
                An error occurred while fetching account information
              </p>
            </div>
          </div>
        ) : account ? (
          <>
            <SheetHeader>
              <SheetTitle className="text-xl flex items-center gap-x-2">
                <span>{account.name}</span>
                <div className="flex gap-2">
                  <Badge variant="outline">
                    {account.balances.avalaibleBalance.currency}
                  </Badge>
                  <Badge
                    variant={
                      account.normalBalance === "debit" ? "default" : "secondary"
                    }
                  >
                    {account.normalBalance.toUpperCase()}
                  </Badge>
                </div>
              </SheetTitle>

              <SheetDescription className="mt-1">
                {account.description || "No description"}
              </SheetDescription>
            </SheetHeader>

        <div className="space-y-4 px-4">
          {/* Balance Cards */}
          <div className="space-y-2">
            <h3 className="font-semibold text-lg">Balances</h3>
            <div className="grid gap-4">
              <div className="rounded-lg border p-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">
                    Posted Balance
                  </span>
                  <span className="font-mono font-semibold">
                    {formatBalance(
                      account.balances.postedBalance.amount,
                      account.balances.postedBalance.currency,
                      account.balances.postedBalance.currencyExponent
                    )}
                  </span>
                </div>
              </div>
              <div className="rounded-lg border p-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">
                    Pending Balance
                  </span>
                  <span className="font-mono font-semibold">
                    {formatBalance(
                      account.balances.pendingBalance.amount,
                      account.balances.pendingBalance.currency,
                      account.balances.pendingBalance.currencyExponent
                    )}
                  </span>
                </div>
              </div>
              <div className="rounded-lg border p-4 bg-muted/20">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">
                    Available Balance
                  </span>
                  <span className="font-mono font-semibold">
                    {formatBalance(
                      account.balances.avalaibleBalance.amount,
                      account.balances.avalaibleBalance.currency,
                      account.balances.avalaibleBalance.currencyExponent
                    )}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Account Details */}
          <div className="space-y-2">
            <h3 className="font-semibold text-lg">Account Details</h3>
            <div className="space-y-3">
              <div className="flex flex-col space-y-1">
                <span className="text-sm text-muted-foreground">
                  Account ID
                </span>
                <span className="text-sm font-mono">{account.id}</span>
              </div>
              <div className="flex flex-col space-y-1">
                <span className="text-sm text-muted-foreground">Ledger ID</span>
                <span className="text-sm font-mono">{account.ledgerId}</span>
              </div>
              <div className="flex flex-col space-y-1">
                <span className="text-sm text-muted-foreground">
                  External ID
                </span>
                <span className="text-sm font-mono">
                  {account.externalId ?? "N/A"}
                </span>
              </div>
            </div>
          </div>

          {/* Metadata */}
          {account.metadata && Object.keys(account.metadata).length > 0 && (
            <div className="space-y-2">
              <h3 className="font-semibold text-lg">Metadata</h3>
              <div className="rounded-md border">
                <table className="w-full text-sm">
                  <thead className="border-b bg-muted/50">
                    <tr>
                      <th className="text-left p-2 font-medium">Key</th>
                      <th className="text-left p-2 font-medium">Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(account.metadata || {}).map(
                      ([key, value], index) => (
                        <tr
                          key={key}
                          className={
                            index !==
                            Object.entries(account.metadata || {}).length - 1
                              ? "border-b"
                              : ""
                          }
                        >
                          <td className="p-2 text-muted-foreground">{key}</td>
                          <td className="p-2">{value}</td>
                        </tr>
                      )
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Timestamps */}
          <div className="space-y-2">
            <h3 className="font-semibold text-lg">Timestamps</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Created at</span>
                <span className="text-sm">{formatDate(account.createdAt)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Updated at</span>
                <span className="text-sm">{formatDate(account.updatedAt)}</span>
              </div>
            </div>
          </div>

          {/* Actions */}
        </div>
            <SheetFooter>
              <EditAccountDialog account={account}>
                <Button className="w-full">Edit Account</Button>
              </EditAccountDialog>
            </SheetFooter>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
