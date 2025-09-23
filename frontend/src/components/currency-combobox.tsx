import { useState } from "react";
import { ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { $api } from "@/lib/api/client";
import { formatCurrencyDisplay } from "@/lib/currency";

interface CurrencyComboboxProps {
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function CurrencyCombobox({
  value,
  onValueChange,
  placeholder = "Select currency...",
  disabled = false,
}: CurrencyComboboxProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch currencies with search functionality
  const { data: currencies, isLoading } = $api.useQuery("get", "/v1/currencies", {
    params: {
      query: {
        limit: 100, // Get more currencies to ensure comprehensive list
        code: searchQuery || undefined, // Filter by search query if provided
      },
    },
  });

  const selectedCurrency = currencies?.data?.find(
    (currency) => currency.code === value
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
          disabled={disabled}
        >
          {selectedCurrency ? (
            <span>
              {formatCurrencyDisplay(selectedCurrency.code, selectedCurrency.name)}
            </span>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command>
          <CommandInput
            placeholder="Search currencies..."
            value={searchQuery}
            onValueChange={setSearchQuery}
          />
          <CommandList>
            <CommandEmpty>
              {isLoading ? "Loading currencies..." : "No currencies found."}
            </CommandEmpty>
            <CommandGroup>
              {currencies?.data?.map((currency) => (
                <CommandItem
                  key={currency.code}
                  value={currency.code}
                  onSelect={(currentValue) => {
                    onValueChange(currentValue === value ? "" : currentValue);
                    setOpen(false);
                  }}
                >
                  <span>
                    {formatCurrencyDisplay(currency.code, currency.name)}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}