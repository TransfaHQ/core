import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { $api } from "@/lib/api/client";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";

interface LedgerEntry {
  id: string;
  sourceAccountId: string;
  destinationAccountId: string;
  amount: string;
  validationError?: string;
}

interface FormData {
  description: string;
  externalId: string;
  ledgerEntries: LedgerEntry[];
  metadata?: Record<string, string>;
}

export function CreateTransactionSheet() {
  const [open, setOpen] = useState(false);
  const [idempotencyKey, setIdempotencyKey] = useState(crypto.randomUUID());
  const [formData, setFormData] = useState<FormData>({
    description: "",
    externalId: "",
    ledgerEntries: [
      {
        id: crypto.randomUUID(),
        sourceAccountId: "",
        destinationAccountId: "",
        amount: "",
      },
    ],
  });

  const queryClient = useQueryClient();

  useEffect(() => {
    if (open) {
      setIdempotencyKey(crypto.randomUUID());
    }
  }, [open]);

  const { data: accounts } = $api.useQuery("get", "/v1/ledger_accounts", {
    params: {
      query: {
        limit: 1000,
      },
    },
  });

  const getAccount = (accountId: string) => {
    return accounts?.data?.find((acc) => acc.id === accountId);
  };

  // Validate entry for same account, different currency, or different ledger
  const validateEntry = (entry: LedgerEntry): string | undefined => {
    if (!entry.sourceAccountId || !entry.destinationAccountId) {
      return undefined; // Skip validation if accounts not selected
    }

    const sourceAccount = getAccount(entry.sourceAccountId);
    const destinationAccount = getAccount(entry.destinationAccountId);

    if (!sourceAccount || !destinationAccount) {
      return undefined;
    }

    // Check if same account
    if (entry.sourceAccountId === entry.destinationAccountId) {
      return "Source and destination accounts must be different";
    }

    // Check if different currencies
    const sourceCurrency = sourceAccount.balances.avalaibleBalance.currency;
    const destCurrency = destinationAccount.balances.avalaibleBalance.currency;
    if (sourceCurrency !== destCurrency) {
      return `Accounts must have the same currency (Source: ${sourceCurrency}, Destination: ${destCurrency})`;
    }

    // Check if different ledgers
    if (sourceAccount.ledgerId !== destinationAccount.ledgerId) {
      return "Accounts must be in the same ledger";
    }

    return undefined;
  };

  const createTransaction = $api.useMutation(
    "post",
    "/v1/ledger_transactions",
    {
      onSuccess: () => {
        setFormData({
          description: "",
          externalId: "",
          ledgerEntries: [
            {
              id: crypto.randomUUID(),
              sourceAccountId: "",
              destinationAccountId: "",
              amount: "",
            },
          ],
        });
        setIdempotencyKey(crypto.randomUUID()); // Generate new key for next transaction
        setOpen(false);
        queryClient.invalidateQueries({
          queryKey: $api.queryOptions("get", "/v1/ledger_entries").queryKey,
        });
      },
    }
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !formData.description.trim() ||
      !formData.externalId.trim() ||
      formData.ledgerEntries.length === 0
    )
      return;

    // Validate all entries are filled
    const hasInvalidEntry = formData.ledgerEntries.some(
      (entry) =>
        !entry.sourceAccountId ||
        !entry.destinationAccountId ||
        !entry.amount ||
        parseFloat(entry.amount) <= 0 ||
        entry.validationError
    );

    if (hasInvalidEntry) return;

    createTransaction.mutate({
      body: {
        description: formData.description.trim(),
        externalId: formData.externalId.trim(),
        ledgerEntries: formData.ledgerEntries.map((entry) => {
          return {
            sourceAccountId: entry.sourceAccountId,
            destinationAccountId: entry.destinationAccountId,
            amount: parseFloat(entry.amount),
          };
        }),
        metadata: formData.metadata,
      },
      params: {
        header: {
          "idempotency-key": idempotencyKey,
        },
      },
    });
  };

  const handleInputChange =
    (field: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement>) => {
      setFormData((prev) => ({
        ...prev,
        [field]: e.target.value,
      }));
    };

  const handleEntryChange =
    (
      entryId: string,
      field: keyof Omit<LedgerEntry, "id" | "validationError">
    ) =>
    (value: string) => {
      setFormData((prev) => ({
        ...prev,
        ledgerEntries: prev.ledgerEntries.map((entry) => {
          if (entry.id === entryId) {
            const updatedEntry = { ...entry, [field]: value };
            // Run validation if changing account fields
            if (
              field === "sourceAccountId" ||
              field === "destinationAccountId"
            ) {
              const error = validateEntry(updatedEntry);
              return { ...updatedEntry, validationError: error };
            }
            return updatedEntry;
          }
          return entry;
        }),
      }));
    };

  const handleAddEntry = () => {
    setFormData((prev) => ({
      ...prev,
      ledgerEntries: [
        ...prev.ledgerEntries,
        {
          id: crypto.randomUUID(),
          sourceAccountId: "",
          destinationAccountId: "",
          amount: "",
        },
      ],
    }));
  };

  const handleRemoveEntry = (entryId: string) => {
    setFormData((prev) => ({
      ...prev,
      ledgerEntries: prev.ledgerEntries.filter((entry) => entry.id !== entryId),
    }));
  };

  const isFormValid =
    formData.description.trim().length >= 3 &&
    formData.externalId.trim() &&
    formData.ledgerEntries.length > 0 &&
    formData.ledgerEntries.every(
      (entry) =>
        entry.sourceAccountId &&
        entry.destinationAccountId &&
        entry.amount &&
        parseFloat(entry.amount) > 0 &&
        !entry.validationError
    );

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button>
          <Plus className="h-4 w-4" />
          Create Transaction
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <SheetHeader>
            <SheetTitle>New Transaction</SheetTitle>
            <SheetDescription>
              Create a new ledger transaction with one or more entries.
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-6 py-4 px-4">
            {/* Transaction Details */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="description">Description *</Label>
                <Input
                  id="description"
                  value={formData.description}
                  onChange={handleInputChange("description")}
                  placeholder="e.g., Payment for invoice #1234"
                  required
                  minLength={3}
                  maxLength={255}
                />
                <p className="text-xs text-muted-foreground">
                  {formData.description.length}/255 characters
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="externalId">External ID *</Label>
                <Input
                  id="externalId"
                  value={formData.externalId}
                  onChange={handleInputChange("externalId")}
                  placeholder="e.g., TXN-001"
                  required
                  maxLength={180}
                />
                <p className="text-xs text-muted-foreground">
                  Unique identifier for this transaction
                </p>
              </div>
            </div>

            <Separator />

            {/* Ledger Entries */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">Ledger Entries</h3>
                  <p className="text-sm text-muted-foreground">
                    Add one or more entries for this transaction
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddEntry}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Entry
                </Button>
              </div>

              {formData.ledgerEntries.map((entry, index) => (
                <div
                  key={entry.id}
                  className={`p-4 border rounded-lg space-y-3 bg-muted/30 ${
                    entry.validationError ? "border-destructive" : ""
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">
                      Entry {index + 1}
                    </span>
                    {formData.ledgerEntries.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveEntry(entry.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </div>

                  <div className=" flex gap-x-4">
                    <div className="space-y-2">
                      <Label htmlFor={`source-${entry.id}`}>
                        Source Account *
                      </Label>
                      <Select
                        value={entry.sourceAccountId}
                        onValueChange={handleEntryChange(
                          entry.id,
                          "sourceAccountId"
                        )}
                      >
                        <SelectTrigger id={`source-${entry.id}`}>
                          <SelectValue placeholder="Select source account" />
                        </SelectTrigger>
                        <SelectContent>
                          {accounts?.data && accounts.data.length > 0 ? (
                            accounts.data.map((account) => (
                              <SelectItem key={account.id} value={account.id}>
                                {account.name} (
                                {account.balances.avalaibleBalance.currency})
                              </SelectItem>
                            ))
                          ) : (
                            <SelectItem value="null" disabled>
                              No accounts available
                            </SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor={`destination-${entry.id}`}>
                        Destination Account *
                      </Label>
                      <Select
                        value={entry.destinationAccountId}
                        onValueChange={handleEntryChange(
                          entry.id,
                          "destinationAccountId"
                        )}
                      >
                        <SelectTrigger id={`destination-${entry.id}`}>
                          <SelectValue placeholder="Select destination account" />
                        </SelectTrigger>
                        <SelectContent>
                          {accounts?.data && accounts.data.length > 0 ? (
                            accounts.data.map((account) => (
                              <SelectItem key={account.id} value={account.id}>
                                {account.name} (
                                {account.balances.avalaibleBalance.currency})
                              </SelectItem>
                            ))
                          ) : (
                            <SelectItem value="null" disabled>
                              No accounts available
                            </SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor={`amount-${entry.id}`}>Amount *</Label>
                      <Input
                        id={`amount-${entry.id}`}
                        type="number"
                        step="0.01"
                        min="0.01"
                        value={entry.amount}
                        onChange={(e) =>
                          handleEntryChange(entry.id, "amount")(e.target.value)
                        }
                        placeholder="0.00"
                        required
                      />
                    </div>
                  </div>

                  {/* Validation Error Display */}
                  {entry.validationError && (
                    <div>
                      <p className="text-sm text-destructive flex items-center gap-2">
                        <span className="mt-0.5">⚠</span>
                        <span>{entry.validationError}</span>
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <SheetFooter>
            <SheetClose asChild>
              <Button
                type="button"
                variant="outline"
                disabled={createTransaction.isPending}
              >
                Cancel
              </Button>
            </SheetClose>
            <Button
              type="submit"
              disabled={createTransaction.isPending || !isFormValid}
            >
              {createTransaction.isPending
                ? "Creating..."
                : "Create Transaction"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
