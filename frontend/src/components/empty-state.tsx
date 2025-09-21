import { BookOpen } from "lucide-react";
import { CreateLedgerDialog } from "../pages/ledger/dialogs/create";

export function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-24 px-4">
      <div className="mx-auto max-w-md text-center">
        <BookOpen className="mx-auto h-16 w-16 text-muted-foreground/50" />
        <h2 className="mt-6 text-xl font-semibold text-foreground">
          No ledgers yet
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Get started by creating your first ledger to organize your financial
          transactions.
        </p>
        <div className="mt-8">
          <CreateLedgerDialog />
        </div>
      </div>
    </div>
  );
}
