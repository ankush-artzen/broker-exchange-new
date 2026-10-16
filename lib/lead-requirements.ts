import { parseArea } from "./area";
import {
  COMMERCIAL_PROPERTY_TYPES,
  FACING_OPTIONS,
  FURNISHING_OPTIONS,
  RESIDENTIAL_PROPERTY_TYPES,
  canonicalPropertyTypeId,
  propertyTypeLabel,
} from "./constants/property";

export const LEAD_CATEGORIES = [
  { id: "residential", label: "Residential" },
  { id: "commercial", label: "Commercial" },
] as const;

export type LeadCategory = (typeof LEAD_CATEGORIES)[number]["id"];

export const LEAD_PROPERTY_TYPE_OPTIONS = [
  ...RESIDENTIAL_PROPERTY_TYPES,
  ...COMMERCIAL_PROPERTY_TYPES.filter((option) => option.id !== "other"),
];

const RESIDENTIAL_IDS = new Set<string>(
  RESIDENTIAL_PROPERTY_TYPES.map((option) => option.id),
);
const COMMERCIAL_IDS = new Set<string>(
  COMMERCIAL_PROPERTY_TYPES.map((option) => option.id),
);

/** Flat, builder floor, villa/kothi, and penthouse ask for BHK. Studio does not. */
export const BHK_PROPERTY_TYPES = new Set([
  "flat",
  "builder-floor",
  "house",
  "penthouse",
]);

/** Plot / land and farmhouse ask for a size range. */
export const PLOT_SIZE_PROPERTY_TYPES = new Set(["plot", "farmhouse"]);

/** Office, shop, SCO/SCF/booth, and warehouse ask for a sq. ft. range. */
export const AREA_PROPERTY_TYPES = new Set(["office", "retail", "sco", "storage"]);

export const PLOT_SIZE_UNITS = [
  { id: "sq-yd", label: "Sq. Yard" },
  { id: "marla", label: "Marla" },
  { id: "kanal", label: "Kanal" },
  { id: "sq-ft", label: "Sq. Ft." },
] as const;

export type PlotSizeUnit = (typeof PLOT_SIZE_UNITS)[number]["id"];

export const LEAD_FLOOR_PREFERENCES = [
  { id: "low", label: "Low" },
  { id: "mid", label: "Mid" },
  { id: "high", label: "High" },
  { id: "any", label: "Any" },
] as const;

export const LEAD_PARKING_OPTIONS = [
  { id: "required", label: "Required" },
  { id: "covered", label: "Covered" },
  { id: "open", label: "Open" },
  { id: "not-required", label: "Not required" },
] as const;

export const LEAD_AMENITY_OPTIONS = [
  { id: "lift", label: "Lift" },
  { id: "security", label: "Security" },
  { id: "power-backup", label: "Power Backup" },
] as const;

export const LEAD_PURPOSE_OPTIONS = [
  { id: "self-use", label: "Self-use" },
  { id: "investment", label: "Investment" },
] as const;

export const LEAD_HOME_LOAN_OPTIONS = [
  { id: "yes", label: "Yes" },
  { id: "no", label: "No" },
] as const;

export const LEAD_POSSESSION_TIMELINES = [
  { id: "immediately", label: "Immediately" },
  { id: "3-months", label: "3 months" },
  { id: "6-months", label: "6 months" },
  { id: "1-year-plus", label: "1 year+" },
] as const;

export const LEAD_FURNISHING_OPTIONS = FURNISHING_OPTIONS;
export const LEAD_FACING_OPTIONS = FACING_OPTIONS;

export type RequirementField = "propertyTypes" | "bhks" | "locations" | "budget";

export interface RequirementDraft {
  category?: string | null;
  propertyTypes?: string[] | null;
  propertyType?: string | null;
  bhks?: string[] | null;
  bhk?: string | null;
  locations?: string[] | null;
  location?: string | null;
  budgetMin?: number | null;
  budgetMax?: number | null;
  constructionStatus?: string | null;
  plotSizeMin?: number | null;
  plotSizeMax?: number | null;
  plotSizeUnit?: string | null;
  plotSize?: string | null;
  areaMin?: number | null;
  areaMax?: number | null;
  areaUnit?: string | null;
  furnishing?: string | null;
  floorPreference?: string | null;
  facing?: string | null;
  parking?: string | null;
  amenities?: string[] | null;
  purpose?: string | null;
  homeLoan?: string | null;
  possessionTimeline?: string | null;
}

export function propertyTypesForCategory(category?: string | null) {
  if (category === "commercial") return [...COMMERCIAL_PROPERTY_TYPES];
  if (category === "residential") return [...RESIDENTIAL_PROPERTY_TYPES];
  return [];
}

export function categoryForPropertyType(type?: string | null): LeadCategory | null {
  const id = canonicalPropertyTypeId(type);
  if (!id || id === "other") return null;
  if (RESIDENTIAL_IDS.has(id) && !COMMERCIAL_IDS.has(id)) return "residential";
  if (COMMERCIAL_IDS.has(id) && !RESIDENTIAL_IDS.has(id)) return "commercial";
  return null;
}

export function inferCategory(types: string[]): LeadCategory | null {
  const categories = new Set<LeadCategory>();
  for (const type of types) {
    const category = categoryForPropertyType(type);
    if (category) categories.add(category);
  }
  if (categories.size === 1) return [...categories][0];
  return null;
}

export function requirementShape(types: string[]) {
  const ids = types.map((type) => canonicalPropertyTypeId(type)).filter(Boolean);
  return {
    needsBhk: ids.some((id) => BHK_PROPERTY_TYPES.has(id)),
    needsPlotSize: ids.some((id) => PLOT_SIZE_PROPERTY_TYPES.has(id)),
    needsArea: ids.some((id) => AREA_PROPERTY_TYPES.has(id)),
  };
}

export function normalizeCategory(value?: string | null): LeadCategory | null {
  const normalized = value?.trim().toLowerCase();
  if (normalized === "residential" || normalized === "commercial") return normalized;
  return null;
}

export function normalizePlotSizeUnit(value?: string | null): PlotSizeUnit | null {
  const normalized = value?.trim().toLowerCase().replace(/\s+/g, " ");
  if (!normalized) return null;
  if (["sq-yd", "sq yd", "sq. yd", "sq. yard", "square yard", "square yards", "gaj", "gajj"].includes(normalized)) {
    return "sq-yd";
  }
  if (normalized === "marla" || normalized === "marlas") return "marla";
  if (normalized === "kanal" || normalized === "kanals") return "kanal";
  if (["sq-ft", "sq ft", "sq. ft", "sq. ft.", "square feet", "square foot"].includes(normalized)) {
    return "sq-ft";
  }
  const byId = PLOT_SIZE_UNITS.find((option) => option.id === normalized);
  if (byId) return byId.id;
  const byLabel = PLOT_SIZE_UNITS.find(
    (option) => option.label.toLowerCase() === normalized,
  );
  return byLabel?.id ?? null;
}

export function normalizeChoice<T extends string>(
  value: string | null | undefined,
  options: readonly { id: T }[],
): T | null {
  const normalized = value?.trim().toLowerCase();
  if (!normalized) return null;
  return options.find((option) => option.id === normalized)?.id ?? null;
}

export function uniqueStrings(values: Array<string | null | undefined>) {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    const trimmed = value?.trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(trimmed);
  }
  return result;
}

export function splitLocations(value?: string | null): string[] {
  const text = value?.trim() ?? "";
  if (!text) return [];
  const parts = text.split(/\s+[·|]\s+|\s+\|\s+/);
  return uniqueStrings(parts);
}

export function joinLocations(values: string[]): string | null {
  const locations = uniqueStrings(values).slice(0, 3);
  return locations.length ? locations.join(" · ") : null;
}

export function positiveMeasure(value: unknown): number | null {
  if (value == null || value === "") return null;
  const amount = typeof value === "number" ? value : Number(String(value).replace(/,/g, ""));
  if (!Number.isFinite(amount) || amount <= 0) return null;
  return Math.round(amount * 100) / 100;
}

export function orderedMeasure(
  min: number | null,
  max: number | null,
): { min: number | null; max: number | null } {
  if (min != null && max == null) return { min, max: min };
  if (max != null && min == null) return { min: max, max };
  if (min != null && max != null && min > max) return { min: max, max: min };
  return { min, max };
}

export function formatMeasureRange(
  min: number | null,
  max: number | null,
  unit: string | null,
): string | null {
  if (min == null && max == null) return null;
  const unitLabel =
    PLOT_SIZE_UNITS.find((option) => option.id === unit)?.label ??
    (unit === "sq-ft" ? "Sq. Ft." : unit);
  const low = min ?? max;
  const high = max ?? min;
  if (low == null) return null;
  const range = high != null && high !== low ? `${formatMeasure(low)}–${formatMeasure(high)}` : formatMeasure(low);
  return unitLabel ? `${range} ${unitLabel}` : range;
}

function formatMeasure(value: number) {
  return Number.isInteger(value) ? String(value) : String(value);
}

export function parseMeasureRange(value?: string | null): {
  min: number | null;
  max: number | null;
  unit: PlotSizeUnit | null;
} {
  const text = value?.trim() ?? "";
  if (!text) return { min: null, max: null, unit: null };
  const parsed = parseArea(text);
  const unit = normalizePlotSizeUnit(parsed.unit) ?? normalizePlotSizeUnit(text);
  const numbers = [...text.matchAll(/(\d+(?:\.\d+)?)/g)].map((match) => Number(match[1]));
  const min = positiveMeasure(numbers[0]);
  const max = positiveMeasure(numbers[1] ?? numbers[0]);
  if ((min == null && max == null) || !unit) return { min: null, max: null, unit: null };
  const ordered = orderedMeasure(min, max);
  return { ...ordered, unit };
}

export function canonicalPropertyTypes(values: Array<string | null | undefined>) {
  const result: string[] = [];
  for (const value of values) {
    const id = canonicalPropertyTypeId(value);
    if (!id) continue;
    const known =
      RESIDENTIAL_IDS.has(id) || COMMERCIAL_IDS.has(id) || id === "other";
    if (!known || result.includes(id)) continue;
    result.push(id);
  }
  return result;
}

export function leadPropertyTypeIds(lead: {
  propertyTypes?: string[] | null;
  propertyType?: string | null;
}) {
  const fromList = canonicalPropertyTypes(lead.propertyTypes ?? []);
  if (fromList.length) return fromList;
  return canonicalPropertyTypes([lead.propertyType]);
}

export function typesMatch(leadTypes: string[], queryTypes: string[]) {
  if (!queryTypes.length) return true;
  const leadIds = canonicalPropertyTypes(leadTypes);
  const queryIds = canonicalPropertyTypes(queryTypes);
  return leadIds.some((id) => queryIds.includes(id));
}

export function requirementFieldErrors(
  input: RequirementDraft,
  explicit: boolean,
): Partial<Record<RequirementField, string>> {
  if (!explicit) return {};
  const errors: Partial<Record<RequirementField, string>> = {};
  const propertyTypes = leadPropertyTypeIds(input);
  const shape = requirementShape(propertyTypes);
  const bhks = uniqueStrings([...(input.bhks ?? []), input.bhk]);
  const locations = uniqueStrings([
    ...(input.locations ?? []),
    ...splitLocations(input.location),
  ]).slice(0, 3);

  const statedCategory = normalizeCategory(input.category);
  const categories = new Set(
    propertyTypes
      .map((type) => categoryForPropertyType(type))
      .filter((category): category is LeadCategory => category != null),
  );
  if (!propertyTypes.length) errors.propertyTypes = "Property type is required";
  else if (categories.size > 1) errors.propertyTypes = "Choose one category";
  else if (
    statedCategory &&
    [...categories].some((category) => category !== statedCategory)
  ) {
    errors.propertyTypes = "Choose property types for the selected category";
  }
  if (shape.needsBhk && !bhks.length) errors.bhks = "BHK is required";
  if (!locations.length) errors.locations = "Add 1 to 3 locations";
  if (locations.length > 3) errors.locations = "Add 1 to 3 locations";
  if (input.budgetMin == null || input.budgetMax == null) {
    errors.budget = "Enter a minimum and maximum budget";
  }
  return errors;
}

export function requirementErrorMessage(
  errors: Partial<Record<RequirementField, string>>,
) {
  return Object.values(errors).filter(Boolean).join(" ");
}

export interface PropertyMatchInput {
  intent?: string | null;
  category?: string | null;
  propertyType?: string | null;
  bedrooms?: string | null;
  location?: string | null;
  price?: string | null;
  possession?: string | null;
  furnishing?: string | null;
}

/**
 * A lead matches a listing when every stated requirement overlaps that listing.
 * Missing values on either side stay compatible.
 */
export function leadMatchesProperty(
  lead: RequirementDraft & { intent?: string | null; budgetMin?: number | null; budgetMax?: number | null },
  property: PropertyMatchInput,
  propertyPrice?: { min: number | null; max: number | null },
): boolean {
  const leadIntent = lead.intent?.trim().toLowerCase();
  const propertyIntent = property.intent?.trim().toLowerCase();
  if (leadIntent && propertyIntent) {
    const buy = leadIntent === "buy" && (propertyIntent === "sell" || propertyIntent === "buy");
    const rent = leadIntent === "rent" && propertyIntent === "rent";
    if (!buy && !rent) return false;
  }

  const leadTypes = leadPropertyTypeIds(lead);
  const propertyType = canonicalPropertyTypeId(property.propertyType);
  if (leadTypes.length && propertyType && !leadTypes.includes(propertyType)) return false;

  const leadCategory = normalizeCategory(lead.category) ?? inferCategory(leadTypes);
  const propertyCategory = normalizeCategory(property.category) ?? categoryForPropertyType(propertyType);
  if (leadCategory && propertyCategory && leadCategory !== propertyCategory) return false;

  const leadBhks = uniqueStrings([...(lead.bhks ?? []), lead.bhk]);
  const propertyBhk = property.bedrooms?.trim();
  if (leadBhks.length && propertyBhk) {
    const normalized = propertyBhk === "4+" ? "4+" : propertyBhk.replace(/\s*bhk/i, "");
    const count = Number.parseInt(normalized, 10);
    const bucket = Number.isFinite(count) && count >= 4 ? "4+" : normalized;
    if (!leadBhks.includes(bucket)) return false;
  }

  if (propertyPrice && (lead.budgetMin != null || lead.budgetMax != null)) {
    const min = propertyPrice.min ?? propertyPrice.max;
    const max = propertyPrice.max ?? propertyPrice.min;
    const leadMin = lead.budgetMin ?? lead.budgetMax;
    const leadMax = lead.budgetMax ?? lead.budgetMin;
    if (min != null && max != null && leadMin != null && leadMax != null) {
      if (max < leadMin || min > leadMax) return false;
    }
  }

  const areas = uniqueStrings([...(lead.locations ?? []), ...splitLocations(lead.location)]);
  const propertyLocation = property.location?.trim().toLowerCase() ?? "";
  if (areas.length && propertyLocation) {
    const hit = areas.some((area) => {
      const needle = area.toLowerCase();
      return propertyLocation.includes(needle) || needle.includes(propertyLocation);
    });
    if (!hit) return false;
  }

  const construction = lead.constructionStatus?.trim().toLowerCase();
  const possession = property.possession?.trim().toLowerCase();
  if (
    construction &&
    construction !== "any" &&
    possession &&
    possession !== construction
  ) {
    return false;
  }

  if (lead.furnishing && property.furnishing && lead.furnishing !== property.furnishing) {
    return false;
  }

  return true;
}

export function normalizeFurnishing(value?: string | null) {
  const text = value?.trim().toLowerCase().replace(/[_]+/g, " ");
  if (!text) return null;
  if (text === "semi" || text === "semi furnished" || text === "semi-furnished" || text === "semifurnished") {
    return "semi" as const;
  }
  if (text === "unfurnished" || text === "un-furnished" || text === "un furnished") {
    return "unfurnished" as const;
  }
  return normalizeChoice(text, LEAD_FURNISHING_OPTIONS);
}

export function normalizeFacing(value?: string | null) {
  const text = value?.trim().toLowerCase().replace(/[_\s]+/g, "-");
  if (!text) return null;
  const aliases: Record<string, string> = {
    n: "north",
    s: "south",
    e: "east",
    w: "west",
    ne: "north-east",
    nw: "north-west",
    se: "south-east",
    sw: "south-west",
    northeast: "north-east",
    northwest: "north-west",
    southeast: "south-east",
    southwest: "south-west",
  };
  return normalizeChoice(aliases[text] ?? text, LEAD_FACING_OPTIONS);
}

export function normalizeParking(value?: string | null) {
  const text = value?.trim().toLowerCase().replace(/[_]+/g, " ");
  if (!text) return null;
  if (text === "not required" || text === "not-required" || text === "no" || text === "none") {
    return "not-required" as const;
  }
  if (text === "yes") return "required" as const;
  return normalizeChoice(text.replace(/\s+/g, "-"), LEAD_PARKING_OPTIONS);
}

export function normalizePurpose(value?: string | null) {
  const text = value?.trim().toLowerCase().replace(/[_]+/g, " ");
  if (!text) return null;
  if (text === "self use" || text === "self-use" || text === "self") return "self-use" as const;
  if (text === "investment" || text === "invest") return "investment" as const;
  return normalizeChoice(text.replace(/\s+/g, "-"), LEAD_PURPOSE_OPTIONS);
}

export function normalizeHomeLoan(value?: string | null) {
  const text = value?.trim().toLowerCase();
  if (!text) return null;
  if (text === "yes" || text === "y") return "yes" as const;
  if (text === "no" || text === "n") return "no" as const;
  return normalizeChoice(text, LEAD_HOME_LOAN_OPTIONS);
}

export function normalizePossessionTimeline(value?: string | null) {
  const text = value?.trim().toLowerCase().replace(/[_]+/g, " ");
  if (!text) return null;
  if (text === "immediately" || text === "immediate" || text === "now") return "immediately" as const;
  if (text === "3 months" || text === "3-months" || text === "3 month") return "3-months" as const;
  if (text === "6 months" || text === "6-months" || text === "6 month") return "6-months" as const;
  if (text === "1 year+" || text === "1 year plus" || text === "1-year-plus" || text === "1 year") {
    return "1-year-plus" as const;
  }
  return normalizeChoice(text.replace(/\s+/g, "-"), LEAD_POSSESSION_TIMELINES);
}

export function normalizeFloorPreference(value?: string | null) {
  const text = value?.trim().toLowerCase();
  if (!text) return null;
  return normalizeChoice(text, LEAD_FLOOR_PREFERENCES);
}

export function normalizeAmenities(values?: Array<string | null> | null) {
  const result: string[] = [];
  for (const value of values ?? []) {
    const text = value?.trim().toLowerCase().replace(/[_]+/g, " ");
    if (!text) continue;
    const id =
      text === "power backup" || text === "power-backup"
        ? "power-backup"
        : text === "security guard"
          ? "security"
          : text;
    const choice = normalizeChoice(id, LEAD_AMENITY_OPTIONS);
    if (choice && !result.includes(choice)) result.push(choice);
  }
  return result;
}

export function propertyTypeLabels(types: string[], category?: string | null) {
  return types
    .map((type) => propertyTypeLabel(category, type) || type)
    .filter(Boolean);
}
