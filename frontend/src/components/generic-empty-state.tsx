import type { LucideProps } from "lucide-react";
import type React from "react";
import type { ComponentType } from "react";

interface GenericEmptyStateProps {
  icon: ComponentType<LucideProps>;
  title: string;
  description: string;
  actionButton?: React.ReactNode;
}

export function GenericEmptyState({ icon: Icon, title, description, actionButton }: GenericEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-24 px-4">
      <div className="mx-auto max-w-md text-center">
        <Icon className="mx-auto h-16 w-16 text-muted-foreground/50" />
        <h2 className="mt-6 text-xl font-semibold text-foreground">
          {title}
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {description}
        </p>
        {actionButton && (
          <div className="mt-8">
            {actionButton}
          </div>
        )}
      </div>
    </div>
  );
}