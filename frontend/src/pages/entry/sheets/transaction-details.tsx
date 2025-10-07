import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { $api } from "@/lib/api/client";
import { formatBalance } from "@/lib/currency";
import { formatDateTime } from "@/lib/date";

interface TransactionDetailsSheetProps {
  transactionId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TransactionDetailsSheet({
  transactionId,
  open,
  onOpenChange,
}: TransactionDetailsSheetProps) {
  // Fetch transaction details
  const { data: transaction, isLoading } = $api.useQuery(
    "get",
    "/v1/ledger_transactions/{id}",
    {
      params: {
        path: {
          id: transactionId || "",
        },
      },
    },
    {
      enabled: !!transactionId && open,
    }
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-24">
            <div className="text-muted-foreground">Loading...</div>
          </div>
        ) : transaction ? (
          <>
            <SheetHeader>
              <SheetTitle>Transaction Details</SheetTitle>
              <SheetDescription>
                View transaction information and all associated entries
              </SheetDescription>
            </SheetHeader>

            <div className="space-y-6 px-4">
              {/* Transaction Details */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="text-sm font-medium text-muted-foreground">
                    External ID
                  </div>
                  <div className="text-sm font-mono">
                    {transaction.externalId}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="text-sm font-medium text-muted-foreground">
                    Description
                  </div>
                  <div className="text-sm">{transaction.description}</div>
                </div>

                <div className="space-y-2">
                  <div className="text-sm font-medium text-muted-foreground">
                    Created At
                  </div>
                  <div className="text-sm">
                    {formatDateTime(transaction.createdAt)}
                  </div>
                </div>
              </div>
              {transaction.metadata &&
                Object.keys(transaction.metadata).length > 0 && (
                  <div className="space-y-2">
                    <h3 className="font-medium">Metadata</h3>
                    <div className="rounded-md border">
                      <table className="w-full text-sm">
                        <thead className="border-b">
                          <tr>
                            <th className="text-left p-2 font-medium">Key</th>
                            <th className="text-left p-2 font-medium">Value</th>
                          </tr>
                        </thead>
                        <tbody>
                          {Object.entries(transaction.metadata || {}).map(
                            ([key, value], index) => (
                              <tr
                                key={key}
                                className={
                                  index !==
                                  Object.entries(transaction.metadata || {})
                                    .length -
                                    1
                                    ? "border-b"
                                    : ""
                                }
                              >
                                <td className="p-2 text-muted-foreground">
                                  {key}
                                </td>
                                <td className="p-2">{value}</td>
                              </tr>
                            )
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

              {/* Entries Table */}
              <div className="space-y-2">
                <div>
                  <h3 className="font-medium">Entries</h3>
                </div>

                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Account</TableHead>
                        <TableHead>Direction</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead>Currency</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {transaction.ledgerEntries.map((entry) => (
                        <TableRow key={entry.id}>
                          <TableCell className="font-medium">
                            {entry.ledgerAccountName}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                entry.direction === "debit"
                                  ? "default"
                                  : "secondary"
                              }
                            >
                              {entry.direction.toUpperCase()}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {formatBalance(
                              entry.amount,
                              entry.ledgerAccountCurrency,
                              entry.ledgerAccountCurrencyExponent
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {entry.ledgerAccountCurrency}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center py-24">
            <div className="text-muted-foreground">Transaction not found</div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
