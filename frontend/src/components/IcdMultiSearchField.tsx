import { useState, useMemo } from "react";
import { Check, ChevronsUpDown, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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

interface IcdMultiSearchFieldProps {
  value: string;
  onChange: (value: string) => void;
  error?: string;
  disabled?: boolean;
}

const SEP = "; ";

function normalize(text: string) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
}

function codeFromItem(item: string) {
  return item.split(" — ")[0] ?? item;
}

export function IcdMultiSearchField({
  value,
  onChange,
  error,
  disabled = false,
}: IcdMultiSearchFieldProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const selected = useMemo(
    () => value.split(SEP).filter(Boolean),
    [value],
  );

  const selectedCodes = useMemo(
    () => new Set(selected.map(codeFromItem)),
    [selected],
  );

  const filtered = useMemo(() => {
    const q = normalize(query.trim());
    const pool = q
      ? ICD10_RO.filter((e) => {
          return (
            e.code.toLowerCase().startsWith(q) || normalize(e.description).includes(q)
          );
        })
      : ICD10_RO;
    return pool.slice(0, 60);
  }, [query]);

  function handleSelect(code: string, description: string) {
    if (selectedCodes.has(code)) {
      const next = selected.filter((s) => codeFromItem(s) !== code);
      onChange(next.join(SEP));
    } else {
      const item = `${code} — ${description}`;
      onChange([...selected, item].join(SEP));
    }
    setQuery("");
  }

  function handleRemove(item: string) {
    onChange(selected.filter((s) => s !== item).join(SEP));
  }

  return (
    <div className="w-full space-y-2">
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selected.map((item) => (
            <Badge
              key={item}
              variant="secondary"
              className="gap-1 pr-1 text-xs font-normal max-w-full"
            >
              <span className="truncate max-w-[300px]">{item}</span>
              {!disabled && (
                <button
                  type="button"
                  onClick={() => handleRemove(item)}
                  className="rounded-sm hover:bg-muted-foreground/20 p-0.5 shrink-0"
                  aria-label={`Sterge ${item}`}
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </Badge>
          ))}
        </div>
      )}

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled}
            className={cn(
              "w-full justify-between font-normal h-9 px-3 text-muted-foreground",
              error && "border-destructive",
            )}
          >
            <span className="truncate text-left">
              Adaugă diagnostic secundar ICD-10...
            </span>
            <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground shrink-0 ml-2" />
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
                        selectedCodes.has(entry.code) ? "opacity-100" : "opacity-0",
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
