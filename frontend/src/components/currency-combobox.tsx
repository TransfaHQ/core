import { useEffect, useState } from "react";
import { keepPreviousData } from "@tanstack/react-query";
import { SearchableCombobox } from "@/components/ui/searchable-combobox";
import { $api } from "@/lib/api/client";
import { formatCurrencyDisplay } from "@/lib/currency";
import { useDebounce } from "@/hooks/use-debounce";

interface CurrencyComboboxProps {
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

type Item = { label: string; value: string };

const valueMap = new Map<string, Item>();

export function CurrencyCombobox({
  value,
  onValueChange,
  placeholder = "Select currency...",
  disabled = false,
  className,
}: CurrencyComboboxProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebounce(searchQuery, 300);
  const [currentValue, setValue] = useState<Item | undefined>();

  useEffect(() => {
    if (value && valueMap.get(value)) {
      setValue(valueMap.get(value));
    }
  }, [value]);

  const { data: currenciesResponse, isLoading } = $api.useQuery(
    "get",
    "/v1/currencies",
    {
      params: {
        query: {
          limit: 20,
          code: debouncedSearch.trim() || undefined,
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

  const currencies = currenciesResponse?.data || [];

  return (
    <SearchableCombobox
      items={currencies.map((currency) => ({
        label: formatCurrencyDisplay(currency.code, currency.name),
        value: currency.code,
      }))}
      value={currentValue}
      onValueChange={handleValueChange}
      onSearchChange={setSearchQuery}
      placeholder={placeholder}
      searchPlaceholder="Search currencies..."
      emptyMessage="No currencies found."
      isLoading={isLoading}
      disabled={disabled}
      className={className}
    />
  );
}
