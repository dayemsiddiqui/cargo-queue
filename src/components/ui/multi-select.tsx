"use client";

import * as React from "react";
import { X, ChevronDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

export type OptionType = {
  value: string;
  label: string;
};

interface MultiSelectProps {
  options: OptionType[];
  selected: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  className?: string;
  emptyText?: string;
}

export function MultiSelect({
  options,
  selected,
  onChange,
  placeholder = "Select options",
  className,
  emptyText = "No options found.",
}: MultiSelectProps) {
  const [open, setOpen] = React.useState(false);

  const handleUnselect = (value: string) => {
    onChange(selected.filter((item) => item !== value));
  };

  // Format the display of selected items
  const selectedItems = selected
    .map((value) => options.find((option) => option.value === value)?.label)
    .filter(Boolean);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-full min-h-9 h-auto justify-between",
            selected.length > 0 ? "px-3 py-2" : "h-9",
            className
          )}
        >
          <div className="flex gap-1 flex-wrap">
            {selected.length > 0 ? (
              selected.map((value) => {
                const option = options.find((o) => o.value === value);
                return (
                  <Badge key={value} variant="secondary" className="mr-1 mb-1">
                    {option?.label}
                    <button
                      className="ml-1 rounded-full outline-none focus:ring-2 focus:ring-ring/50"
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          handleUnselect(value);
                        }
                      }}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                      }}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleUnselect(value);
                      }}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                );
              })
            ) : (
              <span className="text-muted-foreground">{placeholder}</span>
            )}
          </div>
          <ChevronDown className="h-4 w-4 opacity-50 shrink-0" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command>
          <CommandInput placeholder="Search..." />
          <CommandEmpty>{emptyText}</CommandEmpty>
          <CommandGroup>
            <ScrollArea className="max-h-64">
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.value}
                  onSelect={() => {
                    onChange(
                      selected.includes(option.value)
                        ? selected.filter((value) => value !== option.value)
                        : [...selected, option.value]
                    );
                  }}
                >
                  <div
                    className={cn(
                      "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                      selected.includes(option.value)
                        ? "bg-primary text-primary-foreground"
                        : "opacity-50"
                    )}
                  >
                    {selected.includes(option.value) && (
                      <X className="h-3 w-3" />
                    )}
                  </div>
                  {option.label}
                </CommandItem>
              ))}
            </ScrollArea>
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
