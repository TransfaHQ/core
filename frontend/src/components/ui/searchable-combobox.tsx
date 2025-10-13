import { useState } from "react";
import { ChevronsUpDown, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface SearchableComboboxProps {
  items: { label: string; value: string }[];
  selectedItem?: { label: string; value: string };
  onValueChange: (item?: { label: string; value: string }) => void;
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
  selectedItem,
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
    if (currentValue === selectedItem?.value) {
      onValueChange();
      setOpen(false);
      setSearchQuery("");
      onSearchChange("");
    } else {
      const item = items.find((item) => item.value === currentValue);
      onValueChange(item);
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
          {selectedItem && selectedItem.value ? (
            <span className="truncate">{selectedItem.label}</span>
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
        <div className="flex flex-col">
          <div className="border-b p-3">
            <Input
              placeholder={searchPlaceholder}
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="h-9"
            />
          </div>
          <div className="max-h-[300px] overflow-y-auto">
            {items.length === 0 ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                {isLoading ? "Loading..." : emptyMessage}
              </div>
            ) : (
              <div className="p-1">
                {items.map((item) => {
                  const isSelected = selectedItem
                    ? selectedItem.value === item.value
                    : false;
                  return (
                    <div
                      key={item.value}
                      className={cn(
                        "relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground",
                        isSelected && "bg-accent"
                      )}
                      onClick={() => handleSelectChange(item.value)}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          isSelected ? "opacity-100" : "opacity-0"
                        )}
                      />
                      <span className="truncate">{item.label}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
