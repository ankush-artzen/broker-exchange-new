import {
  emptyPropertyListQuery,
  PROPERTY_AVAILABILITY,
  PROPERTY_SORTS,
  type PropertyAvailability,
  type PropertyListQuery,
  type PropertySort,
} from "./property-filters";
import { canonicalPropertyTypes } from "./lead-requirements";
import { LEAD_BHK_OPTIONS, LEAD_CONSTRUCTION_STATUSES } from "./lead-filters";

const AVAILABILITY = new Set<string>(PROPERTY_AVAILABILITY.map((item) => item.id));
const BHKS = new Set<string>(LEAD_BHK_OPTIONS.map((item) => item.id));
const CONSTRUCTION = new Set<string>(
  LEAD_CONSTRUCTION_STATUSES.map((item) => item.id),
);

export interface PropertyListRequest {
  query: PropertyListQuery;
  sort: PropertySort;
  ownerId: string;
  name: string;
}

function readList<T extends string>(
  params: URLSearchParams,
  key: string,
  allowed: Set<string>,
): T[] {
  const result: T[] = [];
  for (const value of params.getAll(key)) {
    for (const part of value.split(",")) {
      const trimmed = part.trim();
      if (!allowed.has(trimmed) || result.includes(trimmed as T)) continue;
      result.push(trimmed as T);
    }
  }
  return result;
}

function readBudget(value: string | null): number | null {
  if (!value?.trim()) return null;
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) return null;
  return number;
}

export function parsePropertyListRequest(
  params: URLSearchParams,
): PropertyListRequest {
  const sortValue = params.get("sort")?.trim() ?? "";
  const sort = PROPERTY_SORTS.some((item) => item.id === sortValue)
    ? (sortValue as PropertySort)
    : "newest";

  let budgetMin = readBudget(params.get("budgetMin"));
  let budgetMax = readBudget(params.get("budgetMax"));
  if (budgetMin != null && budgetMax != null && budgetMin > budgetMax) {
    const swap = budgetMin;
    budgetMin = budgetMax;
    budgetMax = swap;
  }

  const ownerId = params.get("ownerId")?.trim() ?? "";
  const query = emptyPropertyListQuery();
  query.propertyTypes = canonicalPropertyTypes(
    params.getAll("propertyType").flatMap((value) => value.split(",")),
  );
  query.bhks = readList(params, "bhk", BHKS);
  query.constructionStatuses = readList(params, "construction", CONSTRUCTION);
  query.availability = readList<PropertyAvailability>(
    params,
    "availability",
    AVAILABILITY,
  );
  query.location = (params.get("location") ?? "").trim().slice(0, 200);
  query.budgetMin = budgetMin;
  query.budgetMax = budgetMax;

  return {
    query,
    sort,
    ownerId: /^[a-f0-9]{24}$/i.test(ownerId) ? ownerId : "",
    name: (params.get("q") ?? "").trim().slice(0, 120),
  };
}
