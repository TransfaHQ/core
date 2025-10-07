import { SearchableCombobox } from "@/components/ui/searchable-combobox";
import { $api } from "@/lib/api/client";
import { formatCurrencyDisplay } from "@/lib/currency";

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
  // Fetch currencies
  const { data: currenciesResponse, isLoading } = $api.useQuery(
    "get",
    "/v1/currencies",
    {
      params: {
        query: {
          limit: 100,
        },
      },
    }
  );

  const currencies = currenciesResponse?.data || [];

  return (
    <SearchableCombobox<Currency>
      items={currencies}
      value={value}
      onValueChange={onValueChange}
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