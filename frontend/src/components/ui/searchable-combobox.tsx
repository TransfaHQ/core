import { useState } from "react";
import { ChevronsUpDown, Check } from "lucide-react";
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
import { cn } from "@/lib/utils";

interface SearchableComboboxProps {
  items: { label: string; value: string }[];
  value?: { label: string; value: string };
  onValueChange: (item: { label: string; value: string }) => void;
  onSearchChange: (search: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  isLoading?: boolean;
  disabled?: boolean;
  className?: string;
}

export function SearchableCombobox({
  items,
  value,
  onValueChange,
  onSearchChange,
  placeholder = "Select item...",
  searchPlaceholder = "Search...",
  emptyMessage = "No items found.",
  isLoading = false,
  disabled = false,
  className,
}: SearchableComboboxProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const handleSearchChange = (search: string) => {
    setSearchQuery(search);
    onSearchChange(search);
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      setSearchQuery("");
      onSearchChange("");
    }
  };

  const handleSelectChange = (currentValue: string) => {
    const selectedItem = items.find((item) => item.value === currentValue);
    if (selectedItem) {
      onValueChange(selectedItem);
      setOpen(false);
      setSearchQuery("");
      onSearchChange("");
    }
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between", className)}
          disabled={disabled}
        >
          {value ? (
            <span className="truncate">{value.label}</span>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[var(--radix-popover-trigger-width)] p-0"
        align="start"
      >
        <Command>
          <CommandInput
            placeholder={searchPlaceholder}
            value={searchQuery}
            onValueChange={handleSearchChange}
          />
          <CommandList>
            <CommandEmpty>
              {isLoading ? "Loading..." : emptyMessage}
            </CommandEmpty>
            <CommandGroup>
              {items.map((item) => {
                const isSelected = value ? value.value === item.value : false;
                return (
                  <CommandItem
                    key={item.value}
                    value={item.value}
                    onSelect={handleSelectChange}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        isSelected ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <span className="truncate">{item.label}</span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
