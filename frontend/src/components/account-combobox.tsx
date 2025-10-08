import { useEffect, useRef, useState } from "react";
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
  const valueMapRef = useRef(new Map<string, Item>());

  // Fetch the selected account to resolve its label
  const { data: selectedAccountResponse } = $api.useQuery(
    "get",
    "/v1/ledger_accounts/{id}",
    {
      params: {
        path: { id: value },
      },
    },
    {
      enabled: Boolean(value && !valueMapRef.current.get(value)),
    }
  );

  useEffect(() => {
    if (!value) {
      setValue(undefined);
      return;
    }

    const cachedItem = valueMapRef.current.get(value);
    if (cachedItem) {
      setValue(cachedItem);
      return;
    }

    // Use the fetched account data to populate the label
    if (selectedAccountResponse) {
      const account = selectedAccountResponse;
      const item = {
        label: `${account.name} (${account.balances.availableBalance.currency})`,
        value: account.id,
      };
      valueMapRef.current.set(value, item);
      setValue(item);
    }
  }, [value, selectedAccountResponse]);

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

  const handleValueChange = (item?: Item) => {
    if (!item) {
      setValue({ value: "", label: "All currencies" });
      onValueChange("");
    } else {
      setValue(item);
      onValueChange(item.value);
      valueMapRef.current.set(item.value, item);
    }
  };

  const accounts = accountsResponse?.data || [];

  return (
    <SearchableCombobox
      items={accounts.map((account) => ({
        label: `${account.name} (${account.balances.availableBalance.currency})`,
        value: account.id,
      }))}
      selectedItem={currentValue}
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
