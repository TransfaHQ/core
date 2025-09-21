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
import { $api } from "@/lib/api/client";
import { useQueryClient } from "@tanstack/react-query";

interface FormData {
  name: string;
  description: string;
}

export function CreateLedgerDialog() {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    name: "",
    description: "",
  });

  const queryClient = useQueryClient()


  const createLedger = $api.useMutation("post", "/v1/ledgers", {
    onSuccess: () => {
      setFormData({ name: "", description: "" });
      setOpen(false);
      queryClient.invalidateQueries({
        queryKey: $api.queryOptions("get", "/v1/ledgers").queryKey,
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    createLedger.mutate({
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

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4" />
          Create Ledger
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>New Ledger</DialogTitle>
            <DialogDescription>
              Create a new ledger to organize your financial transactions.
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
              disabled={createLedger.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createLedger.isPending || !formData.name.trim()}
            >
              {createLedger.isPending ? "Creating..." : "Create Ledger"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}