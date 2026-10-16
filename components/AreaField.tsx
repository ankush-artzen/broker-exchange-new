"use client";

import { useEffect, useState } from "react";
import { formatArea, parseArea, areaUnits, type AreaUnit } from "@/lib/area";

interface Props {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  variant?: "default" | "add";
}

export function AreaField({
  value,
  onChange,
  label = "Area",
  variant = "default",
}: Props) {
  const [amount, setAmount] = useState("");
  const [unit, setUnit] = useState<AreaUnit>("sq-ft");

  useEffect(() => {
    const parsed = parseArea(value);
    setAmount(parsed.amount);
    setUnit(parsed.unit);
  }, [value]);

  const update = (nextAmount: string, nextUnit: AreaUnit) => {
    setAmount(nextAmount);
    setUnit(nextUnit);
    onChange(formatArea(nextAmount, nextUnit));
  };

  const preview = formatArea(amount, unit);

  const labelClass =
    variant === "add"
      ? "mb-1.5 block text-xs font-semibold text-muted"
      : "mb-1 block text-sm font-medium text-zinc-700";
  const inputClass =
    variant === "add"
      ? "min-w-0 flex-1 rounded-[10px] border border-border bg-surface px-3 py-2.5 text-sm text-primary outline-none focus:border-primary"
      : "min-w-0 flex-1 rounded-xl border border-zinc-200 px-3 py-2.5 text-base outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100";
  const selectClass =
    variant === "add"
      ? "w-[9.5rem] shrink-0 rounded-[10px] border border-border bg-surface px-2.5 py-2.5 text-sm text-primary outline-none focus:border-primary"
      : "w-[9.5rem] shrink-0 rounded-xl border border-zinc-200 px-2.5 py-2.5 text-base outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100";

  return (
    <div>
      <label className={labelClass}>{label}</label>
      <div className="flex gap-2">
        <input
          type="number"
          inputMode="decimal"
          min="0"
          step="any"
          value={amount}
          onChange={(e) => update(e.target.value, unit)}
          placeholder="200"
          aria-label={label}
          className={inputClass}
        />
        <select
          value={unit}
          onChange={(e) => update(amount, e.target.value as AreaUnit)}
          aria-label={`${label} unit`}
          className={selectClass}
        >
          {areaUnits.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
      {preview && (
        <p className="mt-1.5 text-[12px] text-muted">{preview}</p>
      )}
    </div>
  );
}
