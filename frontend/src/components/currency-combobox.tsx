import { useEffect, useMemo, useRef, useState } from "react";
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
  const valueMapRef = useRef(new Map<string, Item>());

  // Fetch the selected currency to resolve its label
  const { data: selectedCurrencyResponse } = $api.useQuery(
    "get",
    "/v1/currencies/{code}",
    {
      params: {
        path: { code: value },
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

    // Use the fetched currency data to populate the label
    if (selectedCurrencyResponse) {
      const currency = selectedCurrencyResponse;
      const item = {
        label: formatCurrencyDisplay(currency.code, currency.name),
        value: currency.code,
      };
      valueMapRef.current.set(value, item);
      setValue(item);
    }
  }, [value, selectedCurrencyResponse]);

  const { data: currenciesResponse, isLoading } = $api.useQuery(
    "get",
    "/v1/currencies",
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

  const currencies = useMemo(
    () =>
      (currenciesResponse?.data ?? []).map((currency) => ({
        label: formatCurrencyDisplay(currency.code, currency.name),
        value: currency.code,
      })),
    [currenciesResponse?.data]
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
  console.log(currencies);
  return (
    <SearchableCombobox
      items={currencies}
      selectedItem={currentValue}
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
