import { useState, useEffect, type ReactNode } from "react";
import { Pencil } from "lucide-react";
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
import { $api } from "@/lib/api/client";
import { useQueryClient } from "@tanstack/react-query";
import type { components } from "@/lib/api/generated/api-types";

type LedgerAccountResponse = components["schemas"]["LedgerAccountResponseDto"];

interface FormData {
  name: string;
  description?: string;
  metadata?: Record<string, string>;
}

interface EditAccountDialogProps {
  account: LedgerAccountResponse;
  children?: ReactNode;
}

export function EditAccountDialog({
  account,
  children,
}: EditAccountDialogProps) {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    name: "",
    description: undefined,
    metadata: undefined,
  });

  const queryClient = useQueryClient();

  // Reset form data when dialog opens or account changes
  useEffect(() => {
    if (open) {
      setFormData({
        name: account.name,
        description: account.description ?? undefined,
        metadata: account.metadata || {},
      });
    }
  }, [open, account]);

  const updateAccount = $api.useMutation("patch", "/v1/ledger_accounts/{id}", {
    onSuccess: () => {
      setOpen(false);
      queryClient.invalidateQueries({
        queryKey: $api.queryOptions("get", "/v1/ledger_accounts").queryKey,
      });
      queryClient.invalidateQueries({
        queryKey: $api.queryOptions("get", "/v1/ledger_accounts/{id}", {
          params: { path: { id: account.id } },
        }).queryKey,
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    updateAccount.mutate({
      params: { path: { id: account.id } },
      body: {
        name: formData.name.trim(),
        description: formData.description?.trim(),
        metadata: formData.metadata,
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

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children ? (
          children
        ) : (
          <Button variant="ghost" size="sm">
            <Pencil className="h-4 w-4" />
            Edit
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Edit Account</DialogTitle>
            <DialogDescription>
              Update the account information. Ledger, currency, and normal
              balance cannot be changed.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Name</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={handleInputChange("name")}
                placeholder="e.g., Cash Account"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Input
                id="edit-description"
                value={formData.description}
                onChange={handleInputChange("description")}
                placeholder="e.g., Company cash account for daily operations"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={updateAccount.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={updateAccount.isPending || !formData.name.trim()}
            >
              {updateAccount.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
