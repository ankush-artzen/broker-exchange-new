import { budgetOverlaps, parseBudgetRange } from "./lead-filters";
import { typesMatch } from "./lead-requirements";
import { getPropertyStatus } from "./utils";

export const PROPERTY_AVAILABILITY = [
  { id: "available", label: "Available" },
  { id: "reserved", label: "Reserved" },
  { id: "sold", label: "Sold Out" },
] as const;

export type PropertyAvailability = (typeof PROPERTY_AVAILABILITY)[number]["id"];

export const PROPERTY_SORTS = [
  { id: "newest", label: "Newest First" },
  { id: "price-desc", label: "Price: High to Low" },
] as const;

export type PropertySort = (typeof PROPERTY_SORTS)[number]["id"];

export interface PropertyListQuery {
  propertyTypes: string[];
  bhks: string[];
  location: string;
  budgetMin: number | null;
  budgetMax: number | null;
  constructionStatuses: string[];
  availability: PropertyAvailability[];
}

export function emptyPropertyListQuery(): PropertyListQuery {
  return {
    propertyTypes: [],
    bhks: [],
    location: "",
    budgetMin: null,
    budgetMax: null,
    constructionStatuses: [],
    availability: [],
  };
}

export interface PropertyFilterable {
  title?: string | null;
  location?: string | null;
  price?: string | null;
  propertyType?: string | null;
  bedrooms?: string | null;
  configuration?: string | null;
  possession?: string | null;
  availability?: string | null;
  city?: string | null;
  locality?: string | null;
  subLocality?: string | null;
  society?: string | null;
  state?: string | null;
  ownerName?: string | null;
  userId?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export function hasPropertyFilters(query: PropertyListQuery): boolean {
  return detailedPropertyFilterCount(query) > 0;
}

export function detailedPropertyFilterCount(query: PropertyListQuery): number {
  return (
    query.propertyTypes.length +
    query.bhks.length +
    query.constructionStatuses.length +
    query.availability.length +
    (query.location.trim() ? 1 : 0) +
    (query.budgetMin != null ? 1 : 0) +
    (query.budgetMax != null ? 1 : 0)
  );
}

export function collectPropertyLocations(rows: PropertyFilterable[]): string[] {
  const values = new Set<string>();
  for (const property of rows) {
    for (const area of [property.location, property.locality, property.city]) {
      const value = area?.trim();
      if (value) values.add(value);
    }
  }
  return [...values].sort((a, b) => a.localeCompare(b));
}

function propertyBhks(property: PropertyFilterable): string[] {
  const bedrooms = property.bedrooms?.trim().toLowerCase() ?? "";
  const fromConfiguration =
    !bedrooms && property.configuration
      ? (property.configuration.match(/(\d+)\s*\+?\s*bhk/i)?.[1] ?? "")
      : "";
  const value = bedrooms || fromConfiguration.toLowerCase();
  if (!value) return [];
  const count = Number.parseInt(value, 10);
  if (value.includes("+") || (Number.isFinite(count) && count >= 4)) return ["4+"];
  if (value === "1" || value === "2" || value === "3") return [value];
  return [];
}

function propertyConstruction(property: PropertyFilterable): string {
  const value = property.possession?.trim().toLowerCase() ?? "";
  if (value === "ready" || value === "immediate") return "ready";
  if (value === "under-construction") return "under-construction";
  return "";
}

function propertyPrice(property: PropertyFilterable) {
  return parseBudgetRange(property.price);
}

export function matchesPropertyQuery(
  property: PropertyFilterable,
  query: PropertyListQuery,
): boolean {
  if (
    query.availability.length > 0 &&
    !query.availability.includes(getPropertyStatus(property) as PropertyAvailability)
  ) {
    return false;
  }
  if (
    query.propertyTypes.length > 0 &&
    !typesMatch(property.propertyType ? [property.propertyType] : [], query.propertyTypes)
  ) {
    return false;
  }
  if (
    query.bhks.length > 0 &&
    !propertyBhks(property).some((bhk) => query.bhks.includes(bhk))
  ) {
    return false;
  }
  if (
    query.constructionStatuses.length > 0 &&
    !query.constructionStatuses.includes("any")
  ) {
    const status = propertyConstruction(property);
    if (!query.constructionStatuses.includes(status)) return false;
  }

  const location = query.location.trim().toLowerCase();
  const locationText = [
    property.location,
    property.city,
    property.locality,
    property.subLocality,
    property.society,
    property.state,
  ]
    .filter(Boolean)
    .join("\n")
    .toLowerCase();
  if (location && !locationText.includes(location)) return false;

  const price = propertyPrice(property);
  return budgetOverlaps(price.min, price.max, query.budgetMin, query.budgetMax);
}

function recency(property: PropertyFilterable): number | null {
  const raw = property.updatedAt || property.createdAt;
  if (!raw) return null;
  const time = new Date(raw).getTime();
  return Number.isFinite(time) ? time : null;
}

function priceSortValue(property: PropertyFilterable): number | null {
  const price = propertyPrice(property);
  return price.max ?? price.min;
}

export function compareProperties(
  a: PropertyFilterable,
  b: PropertyFilterable,
  sort: PropertySort,
): number {
  if (sort === "price-desc") {
    const left = priceSortValue(a);
    const right = priceSortValue(b);
    if (left == null && right == null) return 0;
    if (left == null) return 1;
    if (right == null) return -1;
    return right - left;
  }

  const left = recency(a);
  const right = recency(b);
  if (left == null && right == null) return 0;
  if (left == null) return 1;
  if (right == null) return -1;
  return right - left;
}

export function sortProperties<T extends PropertyFilterable>(
  properties: T[],
  sort: PropertySort,
): T[] {
  return [...properties].sort(
    (a, b) =>
      compareProperties(a, b, sort) ||
      (a.title ?? "").localeCompare(b.title ?? ""),
  );
}

export function sortPropertiesGroupedByOwner<T extends PropertyFilterable>(
  properties: T[],
  sort: PropertySort,
): T[] {
  return [...properties].sort((a, b) => {
    const owner =
      (a.ownerName ?? "").localeCompare(b.ownerName ?? "") ||
      (a.userId ?? "").localeCompare(b.userId ?? "");
    if (owner) return owner;
    return (
      compareProperties(a, b, sort) ||
      (a.title ?? "").localeCompare(b.title ?? "")
    );
  });
}
