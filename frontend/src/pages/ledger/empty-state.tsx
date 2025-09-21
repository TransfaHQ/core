import { BookOpen } from "lucide-react";
import { GenericEmptyState } from "@/components/generic-empty-state";
import { CreateLedgerDialog } from "./dialogs/create";

export function LedgerEmptyState() {
  return (
    <GenericEmptyState
      icon={BookOpen}
      title="No ledgers yet"
      description="Get started by creating your first ledger to organize your financial transactions."
      actionButton={<CreateLedgerDialog />}
    />
  );
}