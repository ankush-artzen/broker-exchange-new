import { normalizePlotSize } from "./area";
import {
  LEAD_AMENITY_OPTIONS,
  LEAD_FACING_OPTIONS,
  LEAD_FLOOR_PREFERENCES,
  LEAD_FURNISHING_OPTIONS,
  LEAD_HOME_LOAN_OPTIONS,
  LEAD_PARKING_OPTIONS,
  LEAD_POSSESSION_TIMELINES,
  LEAD_PROPERTY_TYPE_OPTIONS,
  LEAD_PURPOSE_OPTIONS,
  canonicalPropertyTypes,
  formatMeasureRange,
  inferCategory,
  joinLocations,
  leadPropertyTypeIds,
  normalizeAmenities,
  normalizeCategory,
  normalizeFacing,
  normalizeFloorPreference,
  normalizeFurnishing,
  normalizeHomeLoan,
  normalizeParking,
  normalizePlotSizeUnit,
  normalizePossessionTimeline,
  normalizePurpose,
  orderedMeasure,
  parseMeasureRange,
  positiveMeasure,
  propertyTypeLabels,
  requirementShape,
  splitLocations,
  typesMatch,
  uniqueStrings,
} from "./lead-requirements";
import { formatPrice, type PriceUnit } from "./price";
import {
  followUpHasTime,
  formatDateKey,
  parseFollowUpMoment,
} from "./utils";

export const LEAD_INTENTS = [
  { id: "buy", label: "Buy" },
  { id: "rent", label: "Rent" },
] as const;

export type LeadIntent = (typeof LEAD_INTENTS)[number]["id"];

export const LEAD_PROPERTY_TYPES = LEAD_PROPERTY_TYPE_OPTIONS;

export type LeadPropertyType = (typeof LEAD_PROPERTY_TYPES)[number]["id"];

export const LEAD_BHK_OPTIONS = [
  { id: "1", label: "1" },
  { id: "2", label: "2" },
  { id: "3", label: "3" },
  { id: "4+", label: "4+" },
] as const;

export type LeadBhk = (typeof LEAD_BHK_OPTIONS)[number]["id"];

export const LEAD_CONSTRUCTION_STATUSES = [
  { id: "ready", label: "Ready to Move" },
  { id: "under-construction", label: "Under Construction" },
  { id: "any", label: "Any" },
] as const;

export type LeadConstructionStatus =
  (typeof LEAD_CONSTRUCTION_STATUSES)[number]["id"];

export const LEAD_TEMPERATURES = [
  { id: "hot", label: "Hot", className: "border-overdue-muted bg-overdue-tint text-overdue-muted" },
  { id: "warm", label: "Warm", className: "border-today/40 bg-today-tint text-today" },
  { id: "cold", label: "Cold", className: "border-border bg-surface text-muted" },
] as const;

export type LeadTemperature = (typeof LEAD_TEMPERATURES)[number]["id"];

export function normalizeTemperature(
  value?: string | null,
): LeadTemperature | null {
  const normalized = value?.toLowerCase().trim();
  if (normalized === "hot" || normalized === "warm" || normalized === "cold") {
    return normalized;
  }
  return null;
}

export function leadTemperatureOption(value?: string | null) {
  const id = normalizeTemperature(value);
  return LEAD_TEMPERATURES.find((option) => option.id === id) ?? null;
}

export const LEAD_STATUS_OPTIONS = [
  { id: "new", label: "New", className: "bg-upcoming text-foreground/70" },
  {
    id: "contacted",
    label: "Contacted",
    className: "bg-secondary-tint text-secondary-dark",
  },
  { id: "interested", label: "Interested", className: "bg-ok-tint text-ok" },
  {
    id: "site-visit",
    label: "Site Visit/Meeting",
    className: "bg-today-tint text-today",
  },
  {
    id: "negotiation",
    label: "Negotiation",
    className: "bg-today-tint text-today",
  },
  { id: "closed", label: "Closed", className: "bg-border text-muted" },
] as const;

export type LeadStatus = (typeof LEAD_STATUS_OPTIONS)[number]["id"];

export const FOLLOW_UP_FILTERS = [
  { id: "overdue", label: "Overdue" },
  { id: "today", label: "Today" },
  { id: "this-week", label: "This Week" },
  { id: "none", label: "No Follow-up Set" },
] as const;

export type FollowUpFilter = (typeof FOLLOW_UP_FILTERS)[number]["id"];

export const LEAD_SORTS = [
  { id: "follow-up", label: "Next Follow-up" },
  { id: "newest", label: "Newest First" },
  { id: "budget-desc", label: "Budget: High to Low" },
] as const;

export type LeadSort = (typeof LEAD_SORTS)[number]["id"];

export interface LeadListQuery {
  followUps: FollowUpFilter[];
  statuses: LeadStatus[];
  intents: LeadIntent[];
  propertyTypes: string[];
  bhks: string[];
  location: string;
  budgetMin: number | null;
  budgetMax: number | null;
  constructionStatuses: string[];
}

export function emptyLeadListQuery(): LeadListQuery {
  return {
    followUps: [],
    statuses: [],
    intents: [],
    propertyTypes: [],
    bhks: [],
    location: "",
    budgetMin: null,
    budgetMax: null,
    constructionStatuses: [],
  };
}

export interface LeadFilterable {
  userId?: string | null;
  name?: string | null;
  requirement?: string | null;
  location?: string | null;
  budget?: string | null;
  budgetMin?: number | null;
  budgetMax?: number | null;
  intent?: string | null;
  category?: string | null;
  propertyType?: string | null;
  propertyTypes?: string[] | null;
  bhk?: string | null;
  bhks?: string[] | null;
  locations?: string[] | null;
  constructionStatus?: string | null;
  plotSize?: string | null;
  plotSizeMin?: number | null;
  plotSizeMax?: number | null;
  plotSizeUnit?: string | null;
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
  notes?: string | null;
  followUpDate?: string | null;
  followUpDone?: boolean | null;
  status?: string | null;
  createdAt?: string | null;
  ownerName?: string | null;
}

const LAKH = 100_000;
const CRORE = 10_000_000;

const STATUS_ALIASES: Record<string, LeadStatus> = {
  new: "new",
  contacted: "contacted",
  called: "contacted",
  interested: "interested",
  "site visit": "site-visit",
  "site-visit": "site-visit",
  "site visit/meeting": "site-visit",
  meeting: "site-visit",
  negotiation: "negotiation",
  closed: "closed",
};

export function normalizeLeadStatus(value?: string | null): LeadStatus | null {
  const normalized = value?.toLowerCase().trim().replace(/\s+/g, " ");
  if (!normalized) return null;
  return STATUS_ALIASES[normalized] ?? null;
}

export function getLeadStatus(lead: {
  status?: string | null;
  createdAt?: string | null;
  notes?: string | null;
  requirement?: string | null;
}): LeadStatus {
  const stored = normalizeLeadStatus(lead.status);
  if (stored) return stored;

  const text = `${lead.notes ?? ""} ${lead.requirement ?? ""}`;
  if (/negotiat/i.test(text)) return "negotiation";
  if (/site\s*visit|meeting/i.test(text)) return "site-visit";
  if (/\bcontacted\b|\bcalled\b/i.test(text)) return "contacted";
  if (/\bclosed\b|\bbooked\b/i.test(text)) return "closed";

  const created = lead.createdAt ? new Date(lead.createdAt).getTime() : NaN;
  if (Number.isFinite(created)) {
    const weekAgo = Date.now() - 7 * 86_400_000;
    return created > weekAgo ? "new" : "interested";
  }

  return "new";
}

export function leadStatusOption(status: LeadStatus) {
  return (
    LEAD_STATUS_OPTIONS.find((option) => option.id === status) ??
    LEAD_STATUS_OPTIONS[0]
  );
}

export function normalizeIntent(value?: string | null): LeadIntent | null {
  const normalized = value?.toLowerCase().trim();
  if (!normalized) return null;
  if (normalized === "buy" || normalized === "purchase") return "buy";
  if (normalized === "rent" || normalized === "lease") return "rent";
  return null;
}

export function normalizePropertyType(value?: string | null): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  const lower = trimmed.toLowerCase();
  const direct = canonicalPropertyTypes([lower])[0];
  if (direct && (lower === direct || LEAD_PROPERTY_TYPES.some((option) => option.id === lower))) {
    return direct;
  }
  const byLabel = LEAD_PROPERTY_TYPES.find(
    (option) => option.label.toLowerCase() === lower,
  );
  if (byLabel) return byLabel.id;

  if (/serviced\s*apartment/.test(lower)) return "serviced-apartment";
  if (/penthouse/.test(lower)) return "penthouse";
  if (/builder\s*floor/.test(lower)) return "builder-floor";
  if (/studio|1\s*rk/.test(lower)) return "studio";
  if (/farmhouse/.test(lower)) return "farmhouse";
  if (/\bsco\b|\bscf\b|\bbooth\b|shop[-\s]*cum[-\s]*office/.test(lower)) return "sco";
  if (/warehouse|godown/.test(lower)) return "storage";
  if (/industrial|\bfactory\b|\bshed\b/.test(lower)) return "industry";
  if (/hospitality|guest\s*house|\bhotel\b/.test(lower)) return "hospitality";
  if (/commercial\s*(plot|land)/.test(lower)) return "plot-land";
  if (/office/.test(lower)) return "office";
  if (/retail|showroom|\bshop\b/.test(lower)) return "retail";
  if (/kothi|\bvilla\b|independent\s*house|\bhouse\b/.test(lower)) return "house";
  if (/flat|apartment/.test(lower)) return "flat";
  if (/plot|\bland\b/.test(lower)) return "plot";
  return direct ?? null;
}

export function normalizeBhk(value?: string | null): LeadBhk | null {
  const trimmed = value?.trim().toLowerCase();
  if (!trimmed) return null;
  if (trimmed === "4+" || trimmed === "4 +") return "4+";
  const match = trimmed.match(/^(\d+)\s*\+?/);
  if (!match) return null;
  const count = Number(match[1]);
  if (!Number.isFinite(count) || count < 1) return null;
  if (count >= 4) return "4+";
  return String(count) as LeadBhk;
}

export function normalizeBhkList(
  values?: Array<string | null> | null,
  single?: string | null,
): LeadBhk[] {
  const found = new Set<LeadBhk>();
  for (const value of [...(values ?? []), single]) {
    const bhk = normalizeBhk(value);
    if (bhk) found.add(bhk);
  }
  return LEAD_BHK_OPTIONS.map((option) => option.id).filter((id) => found.has(id));
}

export function normalizeConstruction(
  value?: string | null,
): LeadConstructionStatus | null {
  const normalized = value?.toLowerCase().trim().replace(/\s+/g, " ");
  if (!normalized) return null;
  if (normalized === "any" || normalized === "any status") return "any";
  if (
    normalized === "ready" ||
    normalized === "ready to move" ||
    normalized === "ready-to-move"
  ) {
    return "ready";
  }
  if (
    normalized === "under-construction" ||
    normalized === "under construction"
  ) {
    return "under-construction";
  }
  return null;
}

export function parseRequirementText(value?: string | null): {
  intent: LeadIntent | null;
  propertyType: string | null;
  bhk: LeadBhk | null;
  constructionStatus: LeadConstructionStatus | null;
} {
  const text = value?.trim() ?? "";
  if (!text) {
    return {
      intent: null,
      propertyType: null,
      bhk: null,
      constructionStatus: null,
    };
  }

  let intent: LeadIntent | null = null;
  if (/\brent|\blease\b/i.test(text)) intent = "rent";
  else if (/\bbuy\b|\bpurchase\b|\bfor sale\b/i.test(text)) intent = "buy";

  const bhkMatch = text.match(/(\d+)\s*\+\s*bhk/i) ?? text.match(/(\d+)\s*bhk/i);
  let bhk: LeadBhk | null = null;
  if (bhkMatch) {
    const count = Number(bhkMatch[1]);
    if (count >= 4) bhk = "4+";
    else if (count >= 1) bhk = String(count) as LeadBhk;
  }

  let constructionStatus: LeadConstructionStatus | null = null;
  const percent = text.match(/(\d+)\s*%\s*constructed/i);
  if (/\bany\s+(construction|status|possession)\b/i.test(text)) {
    constructionStatus = "any";
  } else if (/ready\s*to\s*move/i.test(text) || (percent && Number(percent[1]) >= 100)) {
    constructionStatus = "ready";
  } else if (/under\s*construction/i.test(text) || percent) {
    constructionStatus = "under-construction";
  }

  return {
    intent,
    propertyType: normalizePropertyType(text),
    bhk,
    constructionStatus,
  };
}

export function composeRequirement(lead: {
  intent?: string | null;
  category?: string | null;
  propertyType?: string | null;
  propertyTypes?: string[] | null;
  bhk?: string | null;
  bhks?: string[] | null;
  constructionStatus?: string | null;
}): string {
  const parts: string[] = [];
  const intent = LEAD_INTENTS.find((option) => option.id === lead.intent);
  if (intent) parts.push(intent.label);
  const bhks = normalizeBhkList(lead.bhks, lead.bhk);
  if (bhks.length) {
    parts.push(
      bhks
        .map((bhk) => (bhk === "4+" ? "4+ BHK" : `${bhk} BHK`))
        .join(", "),
    );
  }
  const propertyTypes = leadPropertyTypeIds(lead);
  if (propertyTypes.length) {
    parts.push(propertyTypeLabels(propertyTypes, lead.category).join(", "));
  } else if (lead.propertyType?.trim()) {
    parts.push(lead.propertyType.trim());
  }
  const construction = LEAD_CONSTRUCTION_STATUSES.find(
    (option) => option.id === lead.constructionStatus,
  );
  if (construction) parts.push(construction.label);
  return parts.join(" · ");
}

export function displayRequirement(lead: LeadFilterable): string | null {
  const stored = lead.requirement?.trim();
  if (stored) return stored;
  const composed = composeRequirement(viewLead(lead));
  return composed || null;
}

function positiveNumber(value: unknown): number | null {
  if (value == null || value === "") return null;
  const amount = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(amount) || amount <= 0) return null;
  return Math.round(amount);
}

function unitMultiplier(unit: string): number {
  switch (unit) {
    case "k":
    case "thousand":
    case "thousands":
      return 1_000;
    case "l":
    case "lac":
    case "lacs":
    case "lakh":
    case "lakhs":
      return LAKH;
    case "cr":
    case "crore":
    case "crores":
      return CRORE;
    default:
      return 0;
  }
}

function smallerUnit(unit: number): number {
  if (unit >= CRORE) return LAKH;
  if (unit >= LAKH) return 1_000;
  return unit;
}

type BudgetToken = {
  value: number | null;
  unit: number | null;
  amount: number | null;
};

function parseBudgetToken(raw: string): BudgetToken {
  const cleaned = raw.replace(/₹/g, " ").replace(/,/g, "").trim().toLowerCase();
  const match = cleaned.match(
    /(\d+(?:\.\d+)?)(?:\s*(crores|crore|cr|lakhs|lakh|lacs|lac|thousands|thousand|k|l))?/,
  );
  if (!match) return { value: null, unit: null, amount: null };
  const value = Number(match[1]);
  if (!Number.isFinite(value) || value <= 0) {
    return { value: null, unit: null, amount: null };
  }
  const unitName = match[2];
  if (!unitName) {
    if (value >= 10_000) return { value, unit: 1, amount: Math.round(value) };
    return { value, unit: null, amount: null };
  }
  const unit = unitMultiplier(unitName);
  if (!unit) return { value, unit: null, amount: null };
  return { value, unit, amount: Math.round(value * unit) };
}

export function parseBudgetRange(value?: string | null): {
  min: number | null;
  max: number | null;
} {
  const text = value?.trim();
  if (!text) return { min: null, max: null };

  const parts = text
    .split(/\s*(?:–|—|-|\bto\b)\s*/i)
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length >= 2) {
    const left = parseBudgetToken(parts[0]);
    const right = parseBudgetToken(parts[parts.length - 1]);
    let min = left.amount;
    let max = right.amount;

    if (min == null && left.value != null && right.unit) {
      const unit =
        right.value != null && left.value > right.value
          ? smallerUnit(right.unit)
          : right.unit;
      min = Math.round(left.value * unit);
    }
    if (max == null && right.value != null && left.unit) {
      max = Math.round(right.value * left.unit);
    }

    if (min != null && max != null && min > max) {
      return { min: max, max: min };
    }
    return { min, max };
  }

  const single = parseBudgetToken(text);
  if (single.amount == null) return { min: null, max: null };
  return { min: single.amount, max: single.amount };
}

function trimNumber(value: number): string {
  const rounded = Math.round(value * 100) / 100;
  return Number(rounded.toFixed(2)).toString();
}

export function formatBudgetCompact(rupees: number): string {
  const amount = Math.abs(rupees);
  if (amount >= CRORE) return `${trimNumber(rupees / CRORE)}Cr`;
  if (amount >= LAKH) return `${trimNumber(rupees / LAKH)}L`;
  if (amount >= 1_000) return `${trimNumber(rupees / 1_000)}K`;
  return String(Math.round(rupees));
}

export function formatBudgetLabel(
  min?: number | null,
  max?: number | null,
): string {
  if (min == null && max == null) return "";
  if (min != null && max != null) {
    if (min === max) return formatBudgetCompact(min);
    const low = Math.min(min, max);
    const high = Math.max(min, max);
    return `${formatBudgetCompact(low)} - ${formatBudgetCompact(high)}`;
  }
  if (min != null) return `${formatBudgetCompact(min)}+`;
  return `Up to ${formatBudgetCompact(max!)}`;
}

export function rupeesToPriceInput(rupees: number): string {
  const amount = Math.abs(rupees);
  let value = amount;
  let unit: PriceUnit = "thousand";
  if (amount >= CRORE) {
    value = amount / CRORE;
    unit = "crore";
  } else if (amount >= LAKH) {
    value = amount / LAKH;
    unit = "lakh";
  } else if (amount >= 1_000) {
    value = amount / 1_000;
    unit = "thousand";
  }
  return formatPrice(trimNumber(value), unit);
}

export function resolveBudget(lead: {
  budget?: string | null;
  budgetMin?: number | null;
  budgetMax?: number | null;
}): { min: number | null; max: number | null } {
  let min = positiveNumber(lead.budgetMin);
  let max = positiveNumber(lead.budgetMax);
  if (min == null && max == null) return parseBudgetRange(lead.budget);
  if (min == null) min = max;
  if (max == null) max = min;
  if (min != null && max != null && min > max) return { min: max, max: min };
  return { min, max };
}

export function displayBudget(lead: {
  budget?: string | null;
  budgetMin?: number | null;
  budgetMax?: number | null;
}): string | null {
  const stored = lead.budget?.trim();
  if (stored) return stored;
  const { min, max } = resolveBudget(lead);
  return formatBudgetLabel(min, max) || null;
}

export function leadBudgetInputs(lead: {
  budget?: string | null;
  budgetMin?: number | null;
  budgetMax?: number | null;
}): { min: string; max: string } {
  const { min, max } = resolveBudget(lead);
  if (min == null && max == null) return { min: "", max: "" };
  if (min != null && max != null && min === max) {
    return { min: rupeesToPriceInput(min), max: "" };
  }
  return {
    min: min != null ? rupeesToPriceInput(min) : "",
    max: max != null ? rupeesToPriceInput(max) : "",
  };
}

export function viewLead<T extends LeadFilterable>(lead: T): T {
  const budget = resolveBudget(lead);
  const parsed = parseRequirementText(lead.requirement);
  const propertyType =
    normalizePropertyType(lead.propertyType) ?? parsed.propertyType;
  const propertyTypes = leadPropertyTypeIds({
    propertyTypes: lead.propertyTypes,
    propertyType,
  });
  const bhk = normalizeBhk(lead.bhk) ?? parsed.bhk;
  const bhks = normalizeBhkList(lead.bhks, bhk);
  const locations = uniqueStrings([
    ...(lead.locations ?? []),
    ...splitLocations(lead.location),
  ]).slice(0, 3);
  const category =
    normalizeCategory(lead.category) ?? inferCategory(propertyTypes);
  return {
    ...lead,
    budgetMin: budget.min,
    budgetMax: budget.max,
    intent: normalizeIntent(lead.intent) ?? parsed.intent,
    category,
    propertyType: propertyTypes[0] ?? null,
    propertyTypes,
    bhk: bhks[0] ?? null,
    bhks,
    locations,
    location: locations.length ? joinLocations(locations) : lead.location?.trim() || null,
    constructionStatus:
      normalizeConstruction(lead.constructionStatus) ?? parsed.constructionStatus,
  };
}

export function presentLead<T extends LeadFilterable>(lead: T): T {
  const viewed = viewLead(lead);
  return {
    ...viewed,
    budget: displayBudget(viewed),
  };
}

function optionalText(value: unknown): string | null {
  if (value == null) return null;
  const text = String(value).trim();
  return text || null;
}

export interface LeadWriteFields {
  requirement: string | null;
  location: string | null;
  locations: string[];
  budget: string | null;
  budgetMin: number | null;
  budgetMax: number | null;
  intent: string | null;
  category: string | null;
  propertyType: string | null;
  propertyTypes: string[];
  bhk: string | null;
  bhks: string[];
  constructionStatus: string | null;
  plotSize: string | null;
  plotSizeMin: number | null;
  plotSizeMax: number | null;
  plotSizeUnit: string | null;
  areaMin: number | null;
  areaMax: number | null;
  areaUnit: string | null;
  furnishing: string | null;
  floorPreference: string | null;
  facing: string | null;
  parking: string | null;
  amenities: string[];
  purpose: string | null;
  homeLoan: string | null;
  possessionTimeline: string | null;
  status: string;
}

function stringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return uniqueStrings(
    value.filter((item): item is string => typeof item === "string"),
  );
}

function preferenceFields(input: {
  furnishing?: string | null;
  floorPreference?: string | null;
  facing?: string | null;
  parking?: string | null;
  amenities?: string[] | null;
  purpose?: string | null;
  homeLoan?: string | null;
  possessionTimeline?: string | null;
}) {
  return {
    furnishing: normalizeFurnishing(input.furnishing),
    floorPreference: normalizeFloorPreference(input.floorPreference),
    facing: normalizeFacing(input.facing),
    parking: normalizeParking(input.parking),
    amenities: normalizeAmenities(input.amenities),
    purpose: normalizePurpose(input.purpose),
    homeLoan: normalizeHomeLoan(input.homeLoan),
    possessionTimeline: normalizePossessionTimeline(input.possessionTimeline),
  };
}

export function normalizeLeadWrite(input: {
  requirement?: string | null;
  location?: string | null;
  locations?: string[] | null;
  budget?: string | null;
  budgetMin?: number | null;
  budgetMax?: number | null;
  intent?: string | null;
  category?: string | null;
  propertyType?: string | null;
  propertyTypes?: string[] | null;
  bhk?: string | null;
  bhks?: string[] | null;
  constructionStatus?: string | null;
  plotSize?: string | null;
  plotSizeMin?: number | null;
  plotSizeMax?: number | null;
  plotSizeUnit?: string | null;
  areaMin?: number | null;
  areaMax?: number | null;
  furnishing?: string | null;
  floorPreference?: string | null;
  facing?: string | null;
  parking?: string | null;
  amenities?: string[] | null;
  purpose?: string | null;
  homeLoan?: string | null;
  possessionTimeline?: string | null;
  status?: string | null;
  explicitStructured?: boolean;
  preferBudgetText?: boolean;
}): LeadWriteFields {
  const parsed = parseRequirementText(input.requirement);
  const intent = input.explicitStructured
    ? normalizeIntent(input.intent)
    : (normalizeIntent(input.intent) ?? parsed.intent);
  const listed = canonicalPropertyTypes([
    ...(input.propertyTypes ?? []),
    input.propertyType,
  ]);
  let propertyTypes = input.explicitStructured
    ? listed
    : listed.length
      ? listed
      : canonicalPropertyTypes([parsed.propertyType]);
  const category =
    normalizeCategory(input.category) ?? inferCategory(propertyTypes);
  if (category) {
    propertyTypes = propertyTypes.filter((type) => {
      const typeCategory = inferCategory([type]);
      return typeCategory == null || typeCategory === category;
    });
  }
  const shape = requirementShape(propertyTypes);
  const dropIrrelevant = input.explicitStructured === true && propertyTypes.length > 0;
  const statedBhks = normalizeBhkList(input.bhks, input.bhk);
  const bhks =
    dropIrrelevant && !shape.needsBhk
      ? []
      : input.explicitStructured
        ? statedBhks
        : statedBhks.length
          ? statedBhks
          : normalizeBhkList([], parsed.bhk);
  const constructionStatus = input.explicitStructured
    ? normalizeConstruction(input.constructionStatus)
    : (normalizeConstruction(input.constructionStatus) ??
      parsed.constructionStatus);

  let budgetMin = positiveNumber(input.budgetMin);
  let budgetMax = positiveNumber(input.budgetMax);
  if (input.preferBudgetText || (budgetMin == null && budgetMax == null)) {
    const fromText = parseBudgetRange(input.budget);
    if (input.preferBudgetText || fromText.min != null || fromText.max != null) {
      budgetMin = fromText.min;
      budgetMax = fromText.max;
    }
  }
  if (budgetMin != null && budgetMax == null) budgetMax = budgetMin;
  if (budgetMax != null && budgetMin == null) budgetMin = budgetMax;
  if (budgetMin != null && budgetMax != null && budgetMin > budgetMax) {
    const swap = budgetMin;
    budgetMin = budgetMax;
    budgetMax = swap;
  }

  const locations = uniqueStrings([
    ...(input.locations ?? []),
    ...splitLocations(input.location),
  ]).slice(0, 3);

  let plotSizeMin = positiveMeasure(input.plotSizeMin);
  let plotSizeMax = positiveMeasure(input.plotSizeMax);
  let plotSizeUnit = normalizePlotSizeUnit(input.plotSizeUnit);
  if (plotSizeMin == null && plotSizeMax == null) {
    const fromText = parseMeasureRange(input.plotSize);
    plotSizeMin = fromText.min;
    plotSizeMax = fromText.max;
    plotSizeUnit = fromText.unit;
  }
  const plot = orderedMeasure(plotSizeMin, plotSizeMax);
  plotSizeMin = plot.min;
  plotSizeMax = plot.max;
  const keepPlot = !dropIrrelevant || shape.needsPlotSize;
  if (!keepPlot || !plotSizeUnit) {
    plotSizeMin = null;
    plotSizeMax = null;
    plotSizeUnit = null;
  }
  const plotSize = plotSizeUnit
    ? formatMeasureRange(plotSizeMin, plotSizeMax, plotSizeUnit)
    : input.explicitStructured
      ? null
      : normalizePlotSize(input.plotSize);

  let areaMin = positiveMeasure(input.areaMin);
  let areaMax = positiveMeasure(input.areaMax);
  const area = orderedMeasure(areaMin, areaMax);
  const keepArea = !dropIrrelevant || shape.needsArea;
  areaMin = keepArea ? area.min : null;
  areaMax = keepArea ? area.max : null;
  const areaUnit = areaMin != null || areaMax != null ? "sq-ft" : null;

  const propertyType = propertyTypes[0] ?? null;
  const bhk = bhks[0] ?? null;
  const composed = composeRequirement({
    intent,
    category,
    propertyType,
    propertyTypes,
    bhk,
    bhks,
    constructionStatus,
  });
  const requirement = input.explicitStructured
    ? composed || null
    : input.requirement?.trim() || composed || null;
  const budget =
    input.budget?.trim() || formatBudgetLabel(budgetMin, budgetMax) || null;

  return {
    requirement,
    location: joinLocations(locations),
    locations,
    budget,
    budgetMin,
    budgetMax,
    intent,
    category,
    propertyType,
    propertyTypes,
    bhk,
    bhks,
    constructionStatus,
    plotSize,
    plotSizeMin,
    plotSizeMax,
    plotSizeUnit,
    areaMin,
    areaMax,
    areaUnit,
    ...preferenceFields(input),
    status: normalizeLeadStatus(input.status) ?? "new",
  };
}

export function buildLeadCreateData(body: Record<string, unknown>) {
  return normalizeLeadWrite({
    requirement: optionalText(body.requirement),
    location: optionalText(body.location),
    locations: stringList(body.locations),
    budget: optionalText(body.budget),
    budgetMin: positiveNumber(body.budgetMin),
    budgetMax: positiveNumber(body.budgetMax),
    intent: optionalText(body.intent),
    category: optionalText(body.category),
    propertyType: optionalText(body.propertyType),
    propertyTypes: stringList(body.propertyTypes),
    bhk: optionalText(body.bhk),
    bhks: stringList(body.bhks),
    constructionStatus: optionalText(body.constructionStatus),
    plotSize: optionalText(body.plotSize),
    plotSizeMin: positiveMeasure(body.plotSizeMin),
    plotSizeMax: positiveMeasure(body.plotSizeMax),
    plotSizeUnit: optionalText(body.plotSizeUnit),
    areaMin: positiveMeasure(body.areaMin),
    areaMax: positiveMeasure(body.areaMax),
    furnishing: optionalText(body.furnishing),
    floorPreference: optionalText(body.floorPreference),
    facing: optionalText(body.facing),
    parking: optionalText(body.parking),
    amenities: stringList(body.amenities),
    purpose: optionalText(body.purpose),
    homeLoan: optionalText(body.homeLoan),
    possessionTimeline: optionalText(body.possessionTimeline),
    status: optionalText(body.status),
    explicitStructured: body.explicitStructured === true,
    preferBudgetText:
      body.budgetMin === undefined && body.budgetMax === undefined,
  });
}

const REQUIREMENT_KEYS = [
  "requirement",
  "intent",
  "category",
  "propertyType",
  "propertyTypes",
  "bhk",
  "bhks",
  "constructionStatus",
  "location",
  "locations",
  "plotSize",
  "plotSizeMin",
  "plotSizeMax",
  "plotSizeUnit",
  "areaMin",
  "areaMax",
  "furnishing",
  "floorPreference",
  "facing",
  "parking",
  "amenities",
  "purpose",
  "homeLoan",
  "possessionTimeline",
  "status",
] as const;

export function buildLeadPatchData(
  existing: {
    requirement?: string | null;
    location?: string | null;
    locations?: string[] | null;
    budget?: string | null;
    budgetMin?: number | null;
    budgetMax?: number | null;
    intent?: string | null;
    category?: string | null;
    propertyType?: string | null;
    propertyTypes?: string[] | null;
    bhk?: string | null;
    bhks?: string[] | null;
    constructionStatus?: string | null;
    plotSize?: string | null;
    plotSizeMin?: number | null;
    plotSizeMax?: number | null;
    plotSizeUnit?: string | null;
    areaMin?: number | null;
    areaMax?: number | null;
    furnishing?: string | null;
    floorPreference?: string | null;
    facing?: string | null;
    parking?: string | null;
    amenities?: string[] | null;
    purpose?: string | null;
    homeLoan?: string | null;
    possessionTimeline?: string | null;
    status?: string | null;
  },
  body: Record<string, unknown>,
) {
  const data: Record<string, unknown> = {};

  if (body.name !== undefined) data.name = String(body.name ?? "").trim();
  if (body.phone !== undefined) data.phone = String(body.phone ?? "").trim();
  if (body.source !== undefined) data.source = optionalText(body.source);
  if (body.notes !== undefined) data.notes = optionalText(body.notes);
  if (body.remarks !== undefined) data.remarks = optionalText(body.remarks);
  if (body.temperature !== undefined) {
    data.temperature = normalizeTemperature(
      typeof body.temperature === "string" ? body.temperature : null,
    );
  }
  if (body.followUpDone !== undefined) data.followUpDone = Boolean(body.followUpDone);

  const budgetKeys = ["budget", "budgetMin", "budgetMax"] as const;
  const touchesStructured = REQUIREMENT_KEYS.some((key) => body[key] !== undefined);
  const touchesBudget = budgetKeys.some((key) => body[key] !== undefined);

  if (touchesStructured || touchesBudget) {
    const numbersProvided =
      body.budgetMin !== undefined || body.budgetMax !== undefined;
    const merged = normalizeLeadWrite({
      requirement:
        body.requirement !== undefined
          ? optionalText(body.requirement)
          : existing.requirement,
      location:
        body.location !== undefined
          ? optionalText(body.location)
          : existing.location,
      locations:
        body.locations !== undefined
          ? stringList(body.locations)
          : existing.locations,
      budget:
        body.budget !== undefined ? optionalText(body.budget) : existing.budget,
      budgetMin:
        body.budgetMin !== undefined
          ? positiveNumber(body.budgetMin)
          : existing.budgetMin,
      budgetMax:
        body.budgetMax !== undefined
          ? positiveNumber(body.budgetMax)
          : existing.budgetMax,
      intent:
        body.intent !== undefined ? optionalText(body.intent) : existing.intent,
      category:
        body.category !== undefined
          ? optionalText(body.category)
          : existing.category,
      propertyType:
        body.propertyType !== undefined
          ? optionalText(body.propertyType)
          : existing.propertyType,
      propertyTypes:
        body.propertyTypes !== undefined
          ? stringList(body.propertyTypes)
          : existing.propertyTypes,
      bhk: body.bhk !== undefined ? optionalText(body.bhk) : existing.bhk,
      bhks: body.bhks !== undefined ? stringList(body.bhks) : existing.bhks,
      constructionStatus:
        body.constructionStatus !== undefined
          ? optionalText(body.constructionStatus)
          : existing.constructionStatus,
      plotSize:
        body.plotSize !== undefined
          ? optionalText(body.plotSize)
          : existing.plotSize,
      plotSizeMin:
        body.plotSizeMin !== undefined
          ? positiveMeasure(body.plotSizeMin)
          : existing.plotSizeMin,
      plotSizeMax:
        body.plotSizeMax !== undefined
          ? positiveMeasure(body.plotSizeMax)
          : existing.plotSizeMax,
      plotSizeUnit:
        body.plotSizeUnit !== undefined
          ? optionalText(body.plotSizeUnit)
          : existing.plotSizeUnit,
      areaMin:
        body.areaMin !== undefined
          ? positiveMeasure(body.areaMin)
          : existing.areaMin,
      areaMax:
        body.areaMax !== undefined
          ? positiveMeasure(body.areaMax)
          : existing.areaMax,
      furnishing:
        body.furnishing !== undefined
          ? optionalText(body.furnishing)
          : existing.furnishing,
      floorPreference:
        body.floorPreference !== undefined
          ? optionalText(body.floorPreference)
          : existing.floorPreference,
      facing:
        body.facing !== undefined ? optionalText(body.facing) : existing.facing,
      parking:
        body.parking !== undefined
          ? optionalText(body.parking)
          : existing.parking,
      amenities:
        body.amenities !== undefined
          ? stringList(body.amenities)
          : existing.amenities,
      purpose:
        body.purpose !== undefined
          ? optionalText(body.purpose)
          : existing.purpose,
      homeLoan:
        body.homeLoan !== undefined
          ? optionalText(body.homeLoan)
          : existing.homeLoan,
      possessionTimeline:
        body.possessionTimeline !== undefined
          ? optionalText(body.possessionTimeline)
          : existing.possessionTimeline,
      status:
        body.status !== undefined ? optionalText(body.status) : existing.status,
      explicitStructured:
        body.explicitStructured === true ||
        body.intent !== undefined ||
        body.propertyType !== undefined ||
        body.propertyTypes !== undefined ||
        body.bhk !== undefined ||
        body.bhks !== undefined ||
        body.constructionStatus !== undefined,
      preferBudgetText: body.budget !== undefined && !numbersProvided,
    });

    if (touchesStructured) {
      data.requirement = merged.requirement;
      data.intent = merged.intent;
      data.category = merged.category;
      data.propertyType = merged.propertyType;
      data.propertyTypes = merged.propertyTypes;
      data.bhk = merged.bhk;
      data.bhks = merged.bhks;
      data.constructionStatus = merged.constructionStatus;
      data.location = merged.location;
      data.locations = merged.locations;
      data.plotSize = merged.plotSize;
      data.plotSizeMin = merged.plotSizeMin;
      data.plotSizeMax = merged.plotSizeMax;
      data.plotSizeUnit = merged.plotSizeUnit;
      data.areaMin = merged.areaMin;
      data.areaMax = merged.areaMax;
      data.areaUnit = merged.areaUnit;
      data.furnishing = merged.furnishing;
      data.floorPreference = merged.floorPreference;
      data.facing = merged.facing;
      data.parking = merged.parking;
      data.amenities = merged.amenities;
      data.purpose = merged.purpose;
      data.homeLoan = merged.homeLoan;
      data.possessionTimeline = merged.possessionTimeline;
      if (body.status !== undefined) data.status = merged.status;
    }
    if (touchesBudget) {
      data.budget = merged.budget;
      data.budgetMin = merged.budgetMin;
      data.budgetMax = merged.budgetMax;
    }
  }

  return data;
}

export function migrationPatch(lead: {
  requirement?: string | null;
  location?: string | null;
  locations?: string[] | null;
  budget?: string | null;
  budgetMin?: number | null;
  budgetMax?: number | null;
  intent?: string | null;
  category?: string | null;
  propertyType?: string | null;
  propertyTypes?: string[] | null;
  bhk?: string | null;
  bhks?: string[] | null;
  constructionStatus?: string | null;
  plotSize?: string | null;
  plotSizeMin?: number | null;
  plotSizeMax?: number | null;
  plotSizeUnit?: string | null;
}): Record<string, string | number | string[] | null> | null {
  const viewed = viewLead(lead);
  const data: Record<string, string | number | string[] | null> = {};

  if (lead.budgetMin == null && lead.budgetMax == null && viewed.budgetMin != null) {
    data.budgetMin = viewed.budgetMin;
    if (viewed.budgetMax != null) data.budgetMax = viewed.budgetMax;
  }
  if (!lead.intent && viewed.intent) data.intent = viewed.intent;
  if (viewed.propertyType && lead.propertyType !== viewed.propertyType) {
    data.propertyType = viewed.propertyType;
  }
  if (!(lead.propertyTypes ?? []).length && (viewed.propertyTypes ?? []).length) {
    data.propertyTypes = viewed.propertyTypes ?? [];
  }
  if (!lead.bhk && viewed.bhk) data.bhk = viewed.bhk;
  if (!(lead.bhks ?? []).length && (viewed.bhks ?? []).length) {
    data.bhks = viewed.bhks ?? [];
  }
  if (!lead.category && viewed.category) data.category = viewed.category;
  if (!(lead.locations ?? []).length && (viewed.locations ?? []).length) {
    data.locations = viewed.locations ?? [];
  }
  if (!lead.constructionStatus && viewed.constructionStatus) {
    data.constructionStatus = viewed.constructionStatus;
  }
  if (lead.plotSizeMin == null && lead.plotSizeMax == null && lead.plotSize) {
    const parsed = parseMeasureRange(lead.plotSize);
    if (parsed.unit && parsed.min != null) {
      data.plotSizeMin = parsed.min;
      if (parsed.max != null) data.plotSizeMax = parsed.max;
      data.plotSizeUnit = parsed.unit;
      data.plotSize = formatMeasureRange(parsed.min, parsed.max, parsed.unit);
    }
  }

  return Object.keys(data).length ? data : null;
}

export function hasActiveFollowUp(
  lead: { followUpDate?: string | null; followUpDone?: boolean | null },
): boolean {
  if (lead.followUpDone) return false;
  return parseFollowUpMoment(lead.followUpDate) != null;
}

export function isFollowUpOverdue(
  value: string | null | undefined,
  now = new Date(),
): boolean {
  const date = parseFollowUpMoment(value);
  if (!date) return false;
  if (followUpHasTime(date)) return now.getTime() > date.getTime();
  return formatDateKey(date) < formatDateKey(now);
}

export function isFollowUpToday(
  value: string | null | undefined,
  now = new Date(),
): boolean {
  const date = parseFollowUpMoment(value);
  if (!date) return false;
  return formatDateKey(date) === formatDateKey(now);
}

function endOfLocalWeek(now: Date): Date {
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);
  const weekday = end.getDay();
  const daysUntilSunday = weekday === 0 ? 0 : 7 - weekday;
  end.setDate(end.getDate() + daysUntilSunday);
  return end;
}

/** Today through Sunday, using the viewer's local calendar. */
export function isFollowUpThisWeek(
  value: string | null | undefined,
  now = new Date(),
): boolean {
  const date = parseFollowUpMoment(value);
  if (!date) return false;
  const key = formatDateKey(date);
  return key >= formatDateKey(now) && key <= formatDateKey(endOfLocalWeek(now));
}

export function matchesFollowUpFilter(
  lead: { followUpDate?: string | null; followUpDone?: boolean | null },
  filter: FollowUpFilter,
  now = new Date(),
): boolean {
  const active = hasActiveFollowUp(lead);
  switch (filter) {
    case "none":
      return !active;
    case "overdue":
      return active && isFollowUpOverdue(lead.followUpDate, now);
    case "today":
      return active && isFollowUpToday(lead.followUpDate, now);
    case "this-week":
      return active && isFollowUpThisWeek(lead.followUpDate, now);
    default:
      return false;
  }
}

export function budgetOverlaps(
  leadMin: number | null,
  leadMax: number | null,
  filterMin: number | null,
  filterMax: number | null,
): boolean {
  if (filterMin == null && filterMax == null) return true;
  const min = leadMin ?? leadMax;
  const max = leadMax ?? leadMin;
  if (min == null || max == null) return false;
  if (filterMin != null && max < filterMin) return false;
  if (filterMax != null && min > filterMax) return false;
  return true;
}

/**
 * Chips inside one group match with OR.
 * Follow-up, status, buy/rent, and detailed filters match with AND.
 */
export function matchesLeadQuery(
  lead: LeadFilterable,
  query: LeadListQuery,
  now = new Date(),
): boolean {
  const viewed = viewLead(lead);

  if (
    query.followUps.length > 0 &&
    !query.followUps.some((filter) => matchesFollowUpFilter(viewed, filter, now))
  ) {
    return false;
  }
  if (
    query.statuses.length > 0 &&
    !query.statuses.includes(getLeadStatus(viewed))
  ) {
    return false;
  }
  if (query.intents.length > 0 && !query.intents.includes(viewed.intent as LeadIntent)) {
    return false;
  }
  if (
    query.propertyTypes.length > 0 &&
    !typesMatch(viewed.propertyTypes ?? [], query.propertyTypes)
  ) {
    return false;
  }
  if (
    query.bhks.length > 0 &&
    !(viewed.bhks ?? []).some((bhk) => query.bhks.includes(bhk))
  ) {
    return false;
  }
  if (query.constructionStatuses.length > 0) {
    const status = viewed.constructionStatus ?? "";
    const matchesStatus =
      query.constructionStatuses.includes(status) || status === "any";
    if (!matchesStatus) return false;
  }

  const location = query.location.trim().toLowerCase();
  const locationText = [viewed.location, ...(viewed.locations ?? [])]
    .filter(Boolean)
    .join("\n")
    .toLowerCase();
  if (location && !locationText.includes(location)) {
    return false;
  }

  return budgetOverlaps(
    viewed.budgetMin ?? null,
    viewed.budgetMax ?? null,
    query.budgetMin,
    query.budgetMax,
  );
}

export function hasLeadFilters(query: LeadListQuery): boolean {
  return (
    query.followUps.length > 0 ||
    query.statuses.length > 0 ||
    query.intents.length > 0 ||
    detailedFilterCount(query) > 0
  );
}

export function detailedFilterCount(query: LeadListQuery): number {
  return (
    query.propertyTypes.length +
    query.bhks.length +
    query.constructionStatuses.length +
    (query.location.trim() ? 1 : 0) +
    (query.budgetMin != null ? 1 : 0) +
    (query.budgetMax != null ? 1 : 0)
  );
}

export function toggleValue<T>(values: T[], value: T): T[] {
  return values.includes(value)
    ? values.filter((item) => item !== value)
    : [...values, value];
}

function followUpSortKey(lead: LeadFilterable, now: Date): {
  rank: number;
  time: number;
} {
  if (!hasActiveFollowUp(lead)) {
    return { rank: 3, time: Number.POSITIVE_INFINITY };
  }
  const date = parseFollowUpMoment(lead.followUpDate);
  const time = date?.getTime() ?? Number.POSITIVE_INFINITY;
  if (isFollowUpOverdue(lead.followUpDate, now)) return { rank: 0, time };
  if (isFollowUpToday(lead.followUpDate, now)) return { rank: 1, time };
  return { rank: 2, time };
}

function createdAtTime(lead: LeadFilterable): number | null {
  if (!lead.createdAt) return null;
  const time = new Date(lead.createdAt).getTime();
  return Number.isFinite(time) ? time : null;
}

function budgetSortValue(lead: LeadFilterable): number | null {
  const { min, max } = resolveBudget(lead);
  return max ?? min;
}

export function compareLeads(
  a: LeadFilterable,
  b: LeadFilterable,
  sort: LeadSort,
  now = new Date(),
): number {
  if (sort === "newest") {
    const left = createdAtTime(a);
    const right = createdAtTime(b);
    if (left == null && right == null) return 0;
    if (left == null) return 1;
    if (right == null) return -1;
    return right - left;
  }

  if (sort === "budget-desc") {
    const left = budgetSortValue(a);
    const right = budgetSortValue(b);
    if (left == null && right == null) return 0;
    if (left == null) return 1;
    if (right == null) return -1;
    return right - left;
  }

  const left = followUpSortKey(a, now);
  const right = followUpSortKey(b, now);
  if (left.rank !== right.rank) return left.rank - right.rank;
  if (left.time !== right.time) return left.time - right.time;
  return 0;
}

export function sortLeads<T extends LeadFilterable>(
  leads: T[],
  sort: LeadSort,
  now = new Date(),
): T[] {
  return [...leads].sort(
    (a, b) =>
      compareLeads(a, b, sort, now) ||
      (a.name ?? "").localeCompare(b.name ?? ""),
  );
}

export function sortLeadsGroupedByOwner<T extends LeadFilterable>(
  leads: T[],
  sort: LeadSort,
  now = new Date(),
): T[] {
  return [...leads].sort((a, b) => {
    const owner =
      (a.ownerName ?? "").localeCompare(b.ownerName ?? "") ||
      (a.userId ?? "").localeCompare(b.userId ?? "");
    if (owner) return owner;
    return (
      compareLeads(a, b, sort, now) ||
      (a.name ?? "").localeCompare(b.name ?? "")
    );
  });
}
