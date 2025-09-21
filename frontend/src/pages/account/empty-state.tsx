import { Wallet } from "lucide-react";
import { GenericEmptyState } from "@/components/generic-empty-state";
import { CreateAccountDialog } from "./dialogs/create";

export function AccountEmptyState() {
  return (
    <GenericEmptyState
      icon={Wallet}
      title="No accounts yet"
      description="Get started by creating your first ledger account to track balances and transactions."
      actionButton={<CreateAccountDialog />}
    />
  );
}