"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { completeReaisInput, maskReaisInput } from "@/lib/floor-labels";

export function MoneyField({
  label,
  value,
  onChange,
  id,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  id?: string;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-muted-foreground">
          R$
        </span>
        <Input
          id={id}
          inputMode="decimal"
          autoComplete="off"
          placeholder="0,00"
          className="h-12 pl-10 text-lg font-semibold tabular-nums"
          disabled={disabled}
          value={value}
          onChange={(event) => onChange(maskReaisInput(event.target.value))}
          onBlur={() => onChange(completeReaisInput(value))}
        />
      </div>
    </div>
  );
}
