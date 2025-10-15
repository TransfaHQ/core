import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { useQueryClient } from "@tanstack/react-query";
import { Archive, Check } from "lucide-react";
import { useState } from "react";

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
  const queryClient = useQueryClient();

  const [isPostDialogOpen, setIsPostDialogOpen] = useState(false);
  const [isArchiveDialogOpen, setIsArchiveDialogOpen] = useState(false);

  const [postIdempotencyKey] = useState(crypto.randomUUID());
  const [archiveIdempotencyKey] = useState(crypto.randomUUID());

  const {
    data: transaction,
    isLoading,
    refetch,
  } = $api.useQuery(
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

  // Post transaction mutation
  const postTransaction = $api.useMutation(
    "post",
    "/v1/ledger_transactions/{id}/post",
    {
      onSuccess: () => {
        setIsPostDialogOpen(false);
        queryClient.invalidateQueries({
          queryKey: $api.queryOptions("get", "/v1/ledger_entries").queryKey,
        });
        queryClient.invalidateQueries({
          queryKey: $api.queryOptions("get", "/v1/ledger_transactions")
            .queryKey,
        });
        refetch();
      },
    }
  );

  // Archive transaction mutation
  const archiveTransaction = $api.useMutation(
    "post",
    "/v1/ledger_transactions/{id}/archive",
    {
      onSuccess: () => {
        setIsArchiveDialogOpen(false);
        queryClient.invalidateQueries({
          queryKey: $api.queryOptions("get", "/v1/ledger_entries").queryKey,
        });
        queryClient.invalidateQueries({
          queryKey: $api.queryOptions("get", "/v1/ledger_transactions")
            .queryKey,
        });
        refetch();
      },
    }
  );

  // Handle post transaction
  const handlePostTransaction = () => {
    if (!transactionId) return;
    postTransaction.mutate({
      params: {
        path: { id: transactionId },
        header: { "idempotency-key": postIdempotencyKey },
      },
    });
  };

  // Handle archive transaction
  const handleArchiveTransaction = () => {
    if (!transactionId) return;
    archiveTransaction.mutate({
      params: {
        path: { id: transactionId },
        header: { "idempotency-key": archiveIdempotencyKey },
      },
    });
  };

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
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <div className="text-sm font-medium text-muted-foreground">
                      Status
                    </div>
                    <Badge variant={"outline"}>
                      {transaction.status.toUpperCase()}
                    </Badge>
                  </div>

                  {/* Action Buttons for Pending Transactions */}
                  {transaction.status === "pending" && (
                    <div className="flex gap-2 pt-2">
                      <Button
                        onClick={() => setIsPostDialogOpen(true)}
                        disabled={
                          postTransaction.isPending ||
                          archiveTransaction.isPending
                        }
                      >
                        <Check />
                        Post
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={() => setIsArchiveDialogOpen(true)}
                        disabled={
                          postTransaction.isPending ||
                          archiveTransaction.isPending
                        }
                      >
                        <Archive />
                        Archive
                      </Button>
                    </div>
                  )}
                </div>

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

      {/* Post Transaction Confirmation Dialog */}
      <Dialog open={isPostDialogOpen} onOpenChange={setIsPostDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Post Transaction</DialogTitle>
            <DialogDescription>
              Are you sure you want to post this transaction? This will make the
              transaction permanent and affect account balances immediately.
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button
              onClick={handlePostTransaction}
              disabled={postTransaction.isPending}
            >
              {postTransaction.isPending ? "Posting..." : "Post Transaction"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Archive Transaction Confirmation Dialog */}
      <Dialog open={isArchiveDialogOpen} onOpenChange={setIsArchiveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Archive Transaction</DialogTitle>
            <DialogDescription>
              Are you sure you want to archive this pending transaction? This
              will cancel the transaction and it will not affect any account
              balances. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button
              variant="destructive"
              onClick={handleArchiveTransaction}
              disabled={archiveTransaction.isPending}
            >
              {archiveTransaction.isPending
                ? "Archiving..."
                : "Archive Transaction"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Sheet>
  );
}
