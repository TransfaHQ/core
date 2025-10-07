import { FileText } from "lucide-react";
import { GenericEmptyState } from "@/components/generic-empty-state";

export function EntryEmptyState() {
  return (
    <GenericEmptyState
      icon={FileText}
      title="No entries found"
      description="Ledger entries are created when you record transactions. Start by recording a transaction to see entries here."
    />
  );
}
