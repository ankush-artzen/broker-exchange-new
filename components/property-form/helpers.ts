import { parseArea, toSqft } from "@/lib/area";
import { boundedSalePriceError } from "@/lib/listing-shape";
import type { PropertyFormData } from "@/lib/types";
import type { ListingDraft } from "@/components/property-form/types";

function text(value?: string | null) {
  return value ?? "";
}

export function legacyAreas(initial?: Partial<PropertyFormData>) {
  const carpetArea = text(initial?.carpetArea);
  const plotArea = text(initial?.plotArea);
  const builtUpArea = text(initial?.builtUpArea);
  if (carpetArea || plotArea || builtUpArea) {
    return { carpetArea, plotArea, builtUpArea };
  }
  const area = text(initial?.area);
  const areaType = text(initial?.areaType);
  if (areaType === "plot") return { carpetArea: "", plotArea: area, builtUpArea: "" };
  if (areaType === "built-up" || areaType === "super-built-up") {
    return { carpetArea: "", plotArea: "", builtUpArea: area };
  }
  return { carpetArea: area, plotArea: "", builtUpArea: "" };
}

export function areaSummary(
  input: Pick<ListingDraft, "carpetArea" | "plotArea" | "builtUpArea" | "superBuiltUpArea">,
) {
  return [
    input.carpetArea.trim() && `Carpet ${input.carpetArea.trim()}`,
    input.plotArea.trim() && `Plot ${input.plotArea.trim()}`,
    input.builtUpArea.trim() && `Built-up ${input.builtUpArea.trim()}`,
    input.superBuiltUpArea.trim() && `Super built-up ${input.superBuiltUpArea.trim()}`,
  ]
    .filter(Boolean)
    .join(" · ");
}

const MIN_RENT = 1000;
const MAX_RENT = 10_000_000;

export function priceNumber(value: string) {
  const digits = value.replace(/[^\d]/g, "");
  if (!digits) return 0;
  const amount = Number(digits);
  return Number.isFinite(amount) ? amount : 0;
}

export function rentDigits(value: string) {
  if (/lakh|crore|thousand/i.test(value)) return "";
  const digits = value.replace(/[^\d]/g, "").replace(/^0+(?=\d)/, "");
  if (!digits) return "";
  return Number(digits).toLocaleString("en-IN");
}

export function formatRent(amount: string) {
  const head = amount.split(/\s/)[0] ?? "";
  const digits = head.replace(/[^\d]/g, "").replace(/^0+(?=\d)/, "").slice(0, 12);
  if (!digits) return "";
  return `₹${Number(digits).toLocaleString("en-IN")}`;
}

export function salePriceError(value: string, emptyMessage: string) {
  return boundedSalePriceError(priceNumber(value), emptyMessage);
}

export function rentAmountError(value: string, emptyMessage: string) {
  const amount = priceNumber(value);
  if (!amount) return emptyMessage;
  if (amount < MIN_RENT) return "Enter a valid amount of at least ₹1,000";
  if (amount > MAX_RENT) return "Enter a rent up to ₹1 crore";
  return "";
}

export function pricePerSqFt(price: string, plotArea: string) {
  const amount = Number(price.replace(/[^\d]/g, ""));
  const parsed = parseArea(plotArea);
  if (!amount || !parsed.amount) return "";
  const sqft = toSqft(parsed.amount, parsed.unit);
  if (sqft == null || sqft <= 0) return "";
  const per = Math.round(amount / sqft);
  if (!per) return "";
  return `₹${per.toLocaleString("en-IN")}`;
}
