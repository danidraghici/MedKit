import { forwardRef, useCallback } from "react";
import { cn } from "@/lib/utils";
import { parseCNP, type CNPParseResult } from "@/lib/cnp";

export interface CNPInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value"> {
  value: string;
  onChange: (value: string) => void;
  onParsed?: (result: CNPParseResult) => void;
  error?: string;
}

const CNPInput = forwardRef<HTMLInputElement, CNPInputProps>(
  ({ value, onChange, onParsed, error, className, id, ...props }, ref) => {
    const handleChange = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        const digits = e.target.value.replace(/\D/g, "").slice(0, 13);
        onChange(digits);

        if (digits.length === 13 && onParsed) {
          onParsed(parseCNP(digits));
        }
      },
      [onChange, onParsed]
    );

    return (
      <input
        ref={ref}
        id={id}
        type="text"
        inputMode="numeric"
        pattern="\d*"
        maxLength={13}
        autoComplete="off"
        value={value}
        onChange={handleChange}
        className={cn(
          "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors",
          "placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
          "font-mono tracking-widest",
          error && "border-destructive",
          className
        )}
        placeholder="0000000000000"
        {...props}
      />
    );
  }
);

CNPInput.displayName = "CNPInput";

export { CNPInput };
