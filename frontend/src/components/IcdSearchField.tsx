import { useState, useMemo } from "react";
import { Check, ChevronsUpDown, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ICD10_RO } from "@/lib/icd10-ro";

interface IcdSearchFieldProps {
  codeValue: string;
  descriptionValue: string;
  onChange: (code: string, description: string) => void;
  error?: string;
  disabled?: boolean;
}

function normalize(text: string) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
}

export function IcdSearchField({
  codeValue,
  descriptionValue,
  onChange,
  error,
  disabled = false,
}: IcdSearchFieldProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = normalize(query.trim());
    if (!q) return ICD10_RO.slice(0, 60);
    return ICD10_RO.filter((e) => {
      const code = e.code.toLowerCase();
      const desc = normalize(e.description);
      return code.startsWith(q) || desc.includes(q);
    }).slice(0, 60);
  }, [query]);

  const hasSelection = Boolean(codeValue || descriptionValue);
  const displayLabel = hasSelection
    ? codeValue
      ? `${codeValue} — ${descriptionValue}`
      : descriptionValue
    : null;

  function handleSelect(code: string, description: string) {
    onChange(code, description);
    setOpen(false);
    setQuery("");
  }

  function handleClear(e: React.MouseEvent) {
    e.stopPropagation();
    onChange("", "");
    setQuery("");
  }

  return (
    <div className="w-full">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled}
            className={cn(
              "w-full justify-between font-normal h-9 px-3",
              !hasSelection && "text-muted-foreground",
              error && "border-destructive",
            )}
          >
            <span className="truncate text-left">
              {displayLabel ?? "Caută cod sau diagnostic ICD-10..."}
            </span>
            <span className="flex items-center gap-1 shrink-0 ml-2">
              {hasSelection && (
                <span
                  role="button"
                  tabIndex={0}
                  onClick={handleClear}
                  onKeyDown={(e) => e.key === "Enter" && handleClear(e as unknown as React.MouseEvent)}
                  className="rounded-sm p-0.5 hover:bg-accent"
                  aria-label="Șterge selecția"
                >
                  <X className="h-3.5 w-3.5 text-muted-foreground" />
                </span>
              )}
              <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground" />
            </span>
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="p-0 w-(--radix-popover-trigger-width) min-w-[380px]"
          align="start"
          side="bottom"
        >
          <Command shouldFilter={false}>
            <CommandInput
              placeholder="Caută cod (ex. J45) sau denumire (ex. astm)..."
              value={query}
              onValueChange={setQuery}
            />
            <CommandList>
              <CommandEmpty>Niciun cod ICD-10 găsit</CommandEmpty>
              <CommandGroup>
                {filtered.map((entry) => (
                  <CommandItem
                    key={entry.code}
                    value={entry.code}
                    onSelect={() => handleSelect(entry.code, entry.description)}
                    className="gap-2 cursor-pointer"
                  >
                    <Check
                      className={cn(
                        "h-4 w-4 shrink-0",
                        codeValue === entry.code ? "opacity-100" : "opacity-0",
                      )}
                    />
                    <span className="font-mono text-xs text-muted-foreground w-14 shrink-0">
                      {entry.code}
                    </span>
                    <span className="text-sm leading-snug">{entry.description}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
