import { Wallet } from "lucide-react";
import { GenericEmptyState } from "@/components/generic-empty-state";
import { CreateAccountDialog } from "./dialogs/create";

export function AccountEmptyState() {
  return (
    <GenericEmptyState
      icon={Wallet}
      title="No accounts found"
      description="Get started by creating a ledger account to track balances and transactions."
      actionButton={<CreateAccountDialog />}
    />
  );
}