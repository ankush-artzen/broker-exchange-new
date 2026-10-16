"use client";

import { parseArea, toSqft } from "@/lib/area";
import { priceNumber } from "@/components/property-form/helpers";

function formatCount(value: number) {
  const rounded = Math.round(value * 100) / 100;
  return rounded.toLocaleString("en-IN", { maximumFractionDigits: 2 });
}

export function RateReadout({
  price,
  area,
  areaLabel,
}: {
  price: string;
  area: string;
  areaLabel: string;
}) {
  const amount = priceNumber(price);
  const parsed = parseArea(area);
  const sqft = parsed.amount ? toSqft(parsed.amount, parsed.unit) : null;
  const rate = amount > 0 && sqft != null && sqft > 0 ? Math.round(amount / sqft) : null;
  const priceText = amount > 0 ? `₹${amount.toLocaleString("en-IN")}` : "";
  const areaText = sqft != null && sqft > 0 ? `${formatCount(sqft)} sq. ft.` : "";

  const detail =
    priceText && areaText
      ? `${priceText} / ${areaText}`
      : areaText
        ? `Enter the expected price to convert ${areaText}.`
        : "Enter the area to convert the price per sq. ft.";

  return (
    <div>
      <div
        className="flex items-center justify-between gap-2 rounded-xl border border-border bg-background px-3 py-2.5"
        title={
          rate != null
            ? `${priceText} divided by ${areaText} (${areaLabel})`
            : "Expected price divided by the area, converted to sq. ft."
        }
      >
        <span className="text-base text-muted">Per sq. ft.</span>
        <span className={rate != null ? "text-base font-medium text-foreground" : "text-base text-muted"}>
          {rate != null ? `₹${rate.toLocaleString("en-IN")}` : "—"}
        </span>
      </div>
      <p className="mt-2 text-[13px] leading-relaxed text-muted">
        {priceText && areaText ? `${detail} · ${areaLabel}` : detail}
      </p>
    </div>
  );
}
