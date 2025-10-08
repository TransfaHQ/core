import { useState } from "react";
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

type Currency = {
  code: string;
  name: string;
};

export function CurrencyCombobox({
  value,
  onValueChange,
  placeholder = "Select currency...",
  disabled = false,
  className,
}: CurrencyComboboxProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebounce(searchQuery, 300);

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

  const currencies = currenciesResponse?.data || [];

  return (
    <SearchableCombobox<Currency>
      items={currencies}
      value={value}
      onValueChange={onValueChange}
      onSearchChange={setSearchQuery}
      getItemValue={(currency) => currency.code}
      getItemLabel={(currency) =>
        formatCurrencyDisplay(currency.code, currency.name)
      }
      placeholder={placeholder}
      searchPlaceholder="Search currencies..."
      emptyMessage="No currencies found."
      isLoading={isLoading}
      disabled={disabled}
      className={className}
    />
  );
}
