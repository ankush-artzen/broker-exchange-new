import {
  normalizeBhk,
  normalizeBhkList,
  normalizeConstruction,
  normalizeIntent,
  normalizePropertyType,
  parseBudgetRange,
} from "./lead-filters";
import {
  canonicalPropertyTypes,
  formatMeasureRange,
  inferCategory,
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
  requirementShape,
  uniqueStrings,
} from "./lead-requirements";
import type { LeadFormData, ParsedLead } from "./types";
import {
  isValidPersonName,
  normalizeIndianPhone,
  sanitizePersonName,
} from "./utils";

const EMPTY_TOKEN =
  /^(n\/a|na|none|null|unknown|not specified|not mentioned|unsure|tbd|-|—)$/i;

const GENERIC_NAMES = new Set([
  "buyer",
  "client",
  "customer",
  "lead",
  "unknown",
  "someone",
  "person",
  "user",
  "owner",
]);

function textOrNull(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed || EMPTY_TOKEN.test(trimmed)) return null;
  return trimmed;
}

function rawStrings(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string");
  }
  const text = textOrNull(value);
  return text ? [text] : [];
}

function uncertain(value: string) {
  return /\bmaybe\b|\bperhaps\b|around|approx|~/i.test(value);
}

function statedPropertyTypes(value: unknown): string[] {
  const result: string[] = [];
  for (const item of rawStrings(value)) {
    if (uncertain(item) || item.length > 80) continue;
    const parts = item.split(/\s*(?:,|\/|&|\bor\b|\band\b)\s*/i).filter(Boolean);
    const parsed = parts
      .map((part) => (uncertain(part) ? null : normalizePropertyType(part)))
      .filter((part): part is string => Boolean(part));
    if (parts.length > 1 && parsed.length !== parts.length) continue;
    result.push(...(parsed.length ? parsed : []));
    if (!parsed.length) {
      const single = normalizePropertyType(item);
      if (single && !uncertain(item)) result.push(single);
    }
  }
  return canonicalPropertyTypes(result);
}

function statedBhks(value: unknown): string[] {
  const result: string[] = [];
  for (const item of rawStrings(value)) {
    if (uncertain(item) || /between/i.test(item)) continue;
    const parts = item.split(/\s*(?:,|\/|&|\bor\b|\band\b)\s*/i).filter(Boolean);
    if (parts.length > 1) {
      const parsed = parts.map((part) => normalizeBhk(part));
      if (parsed.every(Boolean)) {
        result.push(...parsed.filter((part): part is string => Boolean(part)));
      }
      continue;
    }
    const single = normalizeBhk(item);
    if (single) result.push(single);
  }
  return normalizeBhkList(result);
}

function statedDate(value: unknown): string | null {
  const text = textOrNull(value);
  if (!text) return null;
  const match = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }
  return `${match[1]}-${match[2]}-${match[3]}`;
}

function statedConstruction(value: unknown): string | null {
  const text = textOrNull(value);
  if (!text || uncertain(text)) return null;
  if (/ready/i.test(text) && /under/i.test(text)) return "any";
  return normalizeConstruction(text);
}

/** Keep only details the note actually states. Missing fields stay null. */
export function sanitizeExtractedLead(raw: unknown): ParsedLead {
  const source =
    raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const requirement = textOrNull(source.requirement);

  const nameText = textOrNull(source.name);
  const name =
    nameText &&
    isValidPersonName(nameText) &&
    !GENERIC_NAMES.has(nameText.toLowerCase())
      ? sanitizePersonName(nameText).trim()
      : null;

  const phoneRaw = textOrNull(source.phone);
  const phoneDigits = phoneRaw ? normalizeIndianPhone(phoneRaw) : "";
  const phone = phoneDigits.length === 10 ? phoneDigits : null;

  const budgetText = textOrNull(source.budget);
  const budget =
    budgetText && parseBudgetRange(budgetText).min != null ? budgetText : null;

  const intentText = textOrNull(source.intent);
  const intent =
    intentText && !/\bor\b|maybe/i.test(intentText)
      ? normalizeIntent(intentText)
      : null;

  const propertyTypes = statedPropertyTypes(
    source.propertyTypes ?? source.propertyType,
  );
  const shape = requirementShape(propertyTypes);
  const bhks =
    propertyTypes.length && !shape.needsBhk
      ? []
      : statedBhks(source.bhks ?? source.bhk);
  const category =
    normalizeCategory(textOrNull(source.category)) ?? inferCategory(propertyTypes);

  const locationText = textOrNull(source.location);
  const locations = uniqueStrings([
    ...rawStrings(source.locations).filter((item) => !uncertain(item)),
    ...(locationText && !uncertain(locationText) ? [locationText] : []),
  ]).slice(0, 3);

  const plotFromText = parseMeasureRange(
    textOrNull(source.plotSize) ??
      [textOrNull(source.plotSizeMin), textOrNull(source.plotSizeUnit)]
        .filter(Boolean)
        .join(" "),
  );
  let plotSizeMin = positiveMeasure(source.plotSizeMin) ?? plotFromText.min;
  let plotSizeMax = positiveMeasure(source.plotSizeMax) ?? plotFromText.max;
  let plotSizeUnit =
    normalizePlotSizeUnit(textOrNull(source.plotSizeUnit)) ?? plotFromText.unit;
  const plot = orderedMeasure(plotSizeMin, plotSizeMax);
  if (!plotSizeUnit || plot.min == null) {
    plotSizeMin = null;
    plotSizeMax = null;
    plotSizeUnit = null;
  } else {
    plotSizeMin = plot.min;
    plotSizeMax = plot.max;
  }
  const plotSize = plotSizeUnit
    ? formatMeasureRange(plotSizeMin, plotSizeMax, plotSizeUnit)
    : null;

  const area = orderedMeasure(
    positiveMeasure(source.areaMin),
    positiveMeasure(source.areaMax),
  );
  const amenities = normalizeAmenities(rawStrings(source.amenities));

  return {
    name,
    phone,
    requirement,
    location: locations[0] ?? null,
    locations: locations.length ? locations : null,
    budget,
    intent,
    category,
    propertyType: propertyTypes[0] ?? null,
    propertyTypes: propertyTypes.length ? propertyTypes : null,
    bhk: bhks[0] ?? null,
    bhks: bhks.length ? bhks : null,
    constructionStatus: statedConstruction(source.constructionStatus),
    plotSize,
    plotSizeMin,
    plotSizeMax,
    plotSizeUnit,
    areaMin: area.min,
    areaMax: area.max,
    furnishing: normalizeFurnishing(textOrNull(source.furnishing)),
    floorPreference: normalizeFloorPreference(textOrNull(source.floorPreference)),
    facing: normalizeFacing(textOrNull(source.facing)),
    parking: normalizeParking(textOrNull(source.parking)),
    amenities: amenities.length ? amenities : null,
    purpose: normalizePurpose(textOrNull(source.purpose)),
    homeLoan: normalizeHomeLoan(textOrNull(source.homeLoan)),
    possessionTimeline: normalizePossessionTimeline(
      textOrNull(source.possessionTimeline),
    ),
    source: textOrNull(source.source),
    notes: textOrNull(source.notes),
    followUpDate: statedDate(source.followUpDate),
  };
}

export function extractionFormPatch(result: ParsedLead): Partial<LeadFormData> {
  const patch: Partial<LeadFormData> = {};
  if (result.name) patch.name = result.name;
  if (result.phone) patch.phone = result.phone;
  if (result.intent) patch.intent = result.intent;
  if (result.category) patch.category = result.category;
  if (result.propertyTypes?.length) {
    patch.propertyTypes = result.propertyTypes;
    patch.propertyType = result.propertyTypes[0];
  } else if (result.propertyType) {
    patch.propertyTypes = [result.propertyType];
    patch.propertyType = result.propertyType;
  }
  if (result.bhks?.length) {
    patch.bhks = result.bhks;
    patch.bhk = result.bhks[0];
  } else if (result.bhk) {
    patch.bhks = [result.bhk];
    patch.bhk = result.bhk;
  }
  if (result.constructionStatus) patch.constructionStatus = result.constructionStatus;
  if (result.locations?.length) {
    patch.locations = result.locations.slice(0, 3);
    patch.location = result.locations.slice(0, 3).join(" · ");
  } else if (result.location) {
    patch.locations = [result.location];
    patch.location = result.location;
  }
  if (result.plotSizeMin != null) patch.plotSizeMin = result.plotSizeMin;
  if (result.plotSizeMax != null) patch.plotSizeMax = result.plotSizeMax;
  if (result.plotSizeUnit) patch.plotSizeUnit = result.plotSizeUnit;
  if (result.plotSize) patch.plotSize = result.plotSize;
  if (result.areaMin != null) patch.areaMin = result.areaMin;
  if (result.areaMax != null) patch.areaMax = result.areaMax;
  if (result.areaMin != null || result.areaMax != null) patch.areaUnit = "sq-ft";
  if (result.furnishing) patch.furnishing = result.furnishing;
  if (result.floorPreference) patch.floorPreference = result.floorPreference;
  if (result.facing) patch.facing = result.facing;
  if (result.parking) patch.parking = result.parking;
  if (result.amenities?.length) patch.amenities = result.amenities;
  if (result.purpose) patch.purpose = result.purpose;
  if (result.homeLoan) patch.homeLoan = result.homeLoan;
  if (result.possessionTimeline) patch.possessionTimeline = result.possessionTimeline;
  if (result.followUpDate) patch.followUpDate = result.followUpDate;
  return patch;
}

export function filledExtractionLabels(result: ParsedLead): string[] {
  const filled: string[] = [];
  if (result.name) filled.push("name");
  if (result.phone) filled.push("phone");
  if (result.locations?.length || result.location) filled.push("location");
  if (result.intent) filled.push("buy/rent");
  if (result.category) filled.push("category");
  if (result.propertyTypes?.length || result.propertyType) filled.push("property type");
  if (result.bhks?.length || result.bhk) filled.push("BHK");
  if (result.constructionStatus) filled.push("construction");
  if (result.plotSize || result.plotSizeMin != null) filled.push("plot size");
  if (result.areaMin != null || result.areaMax != null) filled.push("area");
  if (result.budget) filled.push("budget");
  if (result.furnishing || result.floorPreference || result.facing || result.parking) {
    filled.push("preferences");
  }
  if (result.amenities?.length) filled.push("amenities");
  if (result.purpose) filled.push("purpose");
  if (result.homeLoan) filled.push("home loan");
  if (result.possessionTimeline) filled.push("possession");
  if (result.followUpDate) filled.push("follow-up date");
  return filled;
}

export function remarkSourceLines(input: {
  name?: string | null;
  phone?: string | null;
  intent?: string | null;
  category?: string | null;
  propertyType?: string | null;
  propertyTypes?: string[] | null;
  bhk?: string | null;
  bhks?: string[] | null;
  location?: string | null;
  locations?: string[] | null;
  budget?: string | null;
  plotSize?: string | null;
  constructionStatus?: string | null;
  furnishing?: string | null;
  floorPreference?: string | null;
  facing?: string | null;
  parking?: string | null;
  amenities?: string[] | null;
  purpose?: string | null;
  homeLoan?: string | null;
  possessionTimeline?: string | null;
  temperature?: string | null;
  followUpDate?: string | null;
  notes?: string | null;
  status?: string | null;
}): string[] {
  const lines: string[] = [];
  const add = (label: string, value?: string | null) => {
    const text = value?.trim();
    if (text) lines.push(`${label}: ${text}`);
  };
  add("Name", input.name);
  add("Phone", input.phone);
  add("Buy or rent", input.intent);
  add("Category", input.category);
  add(
    "Property type",
    input.propertyTypes?.filter(Boolean).join(", ") || input.propertyType,
  );
  add("BHK", input.bhks?.filter(Boolean).join(", ") || input.bhk);
  add("Construction", input.constructionStatus);
  add("Location", input.locations?.filter(Boolean).join(", ") || input.location);
  add("Budget", input.budget);
  add("Plot size", input.plotSize);
  add("Furnishing", input.furnishing);
  add("Floor", input.floorPreference);
  add("Facing", input.facing);
  add("Parking", input.parking);
  add("Amenities", input.amenities?.filter(Boolean).join(", "));
  add("Purpose", input.purpose);
  add("Home loan", input.homeLoan);
  add("Possession", input.possessionTimeline);
  add("Temperature", input.temperature);
  add("Follow-up date", input.followUpDate);
  add("Status", input.status);
  add("Notes", input.notes);
  return lines;
}
