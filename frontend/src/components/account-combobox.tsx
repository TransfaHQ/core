import { useState } from "react";
import { keepPreviousData } from "@tanstack/react-query";
import { SearchableCombobox } from "@/components/ui/searchable-combobox";
import { $api } from "@/lib/api/client";
import { useDebounce } from "@/hooks/use-debounce";

interface AccountComboboxProps {
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

type LedgerAccount = {
  id: string;
  name: string;
  balances: {
    availableBalance: {
      currency: string;
    };
  };
};

export function AccountCombobox({
  value,
  onValueChange,
  placeholder = "Select account...",
  disabled = false,
  className,
}: AccountComboboxProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebounce(searchQuery, 300);

  const { data: accountsResponse, isLoading } = $api.useQuery(
    "get",
    "/v1/ledger_accounts",
    {
      params: {
        query: {
          limit: 20,
          search: debouncedSearch.trim() || undefined,
        },
      },
    },
    {
      placeholderData: keepPreviousData,
    }
  );

  const accounts = accountsResponse?.data || [];

  return (
    <SearchableCombobox<LedgerAccount>
      items={accounts}
      value={value}
      onValueChange={onValueChange}
      onSearchChange={setSearchQuery}
      getItemValue={(account) => account.id}
      getItemLabel={(account) =>
        `${account.name} (${account.balances.availableBalance.currency})`
      }
      placeholder={placeholder}
      searchPlaceholder="Search accounts..."
      emptyMessage="No accounts found."
      isLoading={isLoading}
      disabled={disabled}
      className={className}
    />
  );
}
