import { useEffect, useState } from "react";
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

type Item = { label: string; value: string };

const valueMap = new Map<string, Item>();

export function AccountCombobox({
  value,
  onValueChange,
  placeholder = "Select account...",
  disabled = false,
  className,
}: AccountComboboxProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebounce(searchQuery, 300);
  const [currentValue, setValue] = useState<Item | undefined>();

  useEffect(() => {
    if (value && valueMap.get(value)) {
      setValue(valueMap.get(value));
    }
  }, [value]);

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

  const handleValueChange = (item: Item) => {
    setValue(item);
    onValueChange(item.value);
    valueMap.set(item.value, item);
  };

  const accounts = accountsResponse?.data || [];

  return (
    <SearchableCombobox
      items={accounts.map((account) => ({
        label: `${account.name} (${account.balances.availableBalance.currency})`,
        value: account.id,
      }))}
      value={currentValue}
      onValueChange={handleValueChange}
      onSearchChange={setSearchQuery}
      placeholder={placeholder}
      searchPlaceholder="Search accounts..."
      emptyMessage="No accounts found."
      isLoading={isLoading}
      disabled={disabled}
      className={className}
    />
  );
}
