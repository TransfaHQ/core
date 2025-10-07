import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CurrencyCombobox } from "@/components/currency-combobox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { $api } from "@/lib/api/client";
import { useQueryClient } from "@tanstack/react-query";

interface FormData {
  name: string;
  description?: string;
  ledgerId: string;
  currency: string;
  currencyExponent?: number;
  normalBalance: "debit" | "credit";
  externalId?: string;
}

export function CreateAccountDialog() {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    name: "",
    description: undefined,
    ledgerId: "",
    currency: "",
    normalBalance: "debit",
    externalId: undefined,
  });

  const queryClient = useQueryClient();

  // Fetch ledgers for the dropdown
  const { data: ledgers } = $api.useQuery("get", "/v1/ledgers");

  const createAccount = $api.useMutation("post", "/v1/ledger_accounts", {
    onSuccess: () => {
      setFormData({
        name: "",
        description: undefined,
        ledgerId: "",
        currency: "",
        normalBalance: "debit",
        externalId: undefined,
      });
      setOpen(false);
      queryClient.invalidateQueries({
        queryKey: $api.queryOptions("get", "/v1/ledger_accounts").queryKey,
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.ledgerId) return;

    createAccount.mutate({
      body: {
        name: formData.name.trim(),
        description: formData.description?.trim(),
        ledgerId: formData.ledgerId,
        currency: formData.currency,
        currencyExponent: formData.currencyExponent,
        normalBalance: formData.normalBalance,
        externalId: formData.externalId?.trim(),
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

  const handleSelectChange = (field: keyof FormData) => (value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4" />
          Create Account
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[525px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>New Account</DialogTitle>
            <DialogDescription>
              Create a new ledger account to track balances and transactions.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={handleInputChange("name")}
                  placeholder="e.g., Cash Account"
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Normal Balance *</Label>
              <RadioGroup
                value={formData.normalBalance}
                onValueChange={(value: "debit" | "credit") =>
                  setFormData((prev) => ({ ...prev, normalBalance: value }))
                }
                className="flex gap-6"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="debit" id="debit" />
                  <Label htmlFor="debit">Debit</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="credit" id="credit" />
                  <Label htmlFor="credit">Credit</Label>
                </div>
              </RadioGroup>
            </div>
            <div className="space-y-2">
              <Label htmlFor="ledger">Ledger *</Label>
              <Select
                value={formData.ledgerId}
                onValueChange={handleSelectChange("ledgerId")}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a ledger" />
                </SelectTrigger>
                <SelectContent>
                  {ledgers?.data && ledgers.data.length > 0 ? (
                    ledgers.data.map((ledger) => (
                      <SelectItem key={ledger.id} value={ledger.id}>
                        {ledger.name}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="null" disabled>
                      No ledgers available
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={handleInputChange("description")}
                placeholder="e.g., Company cash account for daily operations"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="currency">Currency</Label>
                <CurrencyCombobox
                  value={formData.currency}
                  onValueChange={handleSelectChange("currency")}
                  placeholder="Select currency..."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="externalId">External ID</Label>
                <Input
                  id="externalId"
                  value={formData.externalId}
                  onChange={handleInputChange("externalId")}
                  placeholder="e.g., ACC-001"
                />
              </div>
            </div>

            
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={createAccount.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={
                createAccount.isPending ||
                !formData.name.trim() ||
                !formData.ledgerId
              }
            >
              {createAccount.isPending ? "Creating..." : "Create Account"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
