import { useState } from "react";
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

interface FormData {
  name: string;
  description: string;
}

interface EditLedgerDialogProps {
  ledger: {
    id: string;
    name: string;
    description?: string;
  };
}

export function EditLedgerDialog({ ledger }: EditLedgerDialogProps) {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    name: ledger.name,
    description: ledger.description || "",
  });

  const queryClient = useQueryClient();

  const updateLedger = $api.useMutation("patch", "/v1/ledgers/{id}", {
    onSuccess: () => {
      setOpen(false);
      queryClient.invalidateQueries({
        queryKey: $api.queryOptions("get", "/v1/ledgers").queryKey,
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    updateLedger.mutate({
      params: { path: { id: ledger.id } },
      body: {
        name: formData.name.trim(),
        description: formData.description.trim(),
      },
    });
  };

  const handleInputChange = (field: keyof FormData) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setFormData((prev) => ({
      ...prev,
      [field]: e.target.value,
    }));
  };

  const resetForm = () => {
    setFormData({
      name: ledger.name,
      description: ledger.description || "",
    });
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen && !updateLedger.isPending) {
      resetForm();
    }
    setOpen(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Pencil className="h-4 w-4" />
          Edit
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Edit Ledger</DialogTitle>
            <DialogDescription>
              Update the ledger name and description.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-right">
                Name
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={handleInputChange("name")}
                className="col-span-3"
                placeholder="e.g., Company General Ledger"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description" className="text-right">
                Description
              </Label>
              <Input
                id="description"
                value={formData.description}
                onChange={handleInputChange("description")}
                className="col-span-3"
                placeholder="e.g., Main accounting ledger for operations"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={updateLedger.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={updateLedger.isPending || !formData.name.trim()}
            >
              {updateLedger.isPending ? "Updating..." : "Update Ledger"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}