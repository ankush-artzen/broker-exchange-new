import {
  emptyLeadListQuery,
  FOLLOW_UP_FILTERS,
  LEAD_BHK_OPTIONS,
  LEAD_CONSTRUCTION_STATUSES,
  LEAD_INTENTS,
  LEAD_SORTS,
  LEAD_STATUS_OPTIONS,
  type FollowUpFilter,
  type LeadBhk,
  type LeadIntent,
  type LeadListQuery,
  type LeadSort,
  type LeadStatus,
} from "./lead-filters";
import { canonicalPropertyTypes } from "./lead-requirements";

const FOLLOW_UPS = new Set<string>(FOLLOW_UP_FILTERS.map((item) => item.id));
const STATUSES = new Set<string>(LEAD_STATUS_OPTIONS.map((item) => item.id));
const INTENTS = new Set<string>(LEAD_INTENTS.map((item) => item.id));
const BHKS = new Set<string>(LEAD_BHK_OPTIONS.map((item) => item.id));
const CONSTRUCTION = new Set<string>(
  LEAD_CONSTRUCTION_STATUSES.map((item) => item.id),
);

export interface LeadListRequest {
  query: LeadListQuery;
  sort: LeadSort;
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

export function parseLeadListRequest(params: URLSearchParams): LeadListRequest {
  const sortValue = params.get("sort")?.trim() ?? "";
  const sort = LEAD_SORTS.some((item) => item.id === sortValue)
    ? (sortValue as LeadSort)
    : "follow-up";

  let budgetMin = readBudget(params.get("budgetMin"));
  let budgetMax = readBudget(params.get("budgetMax"));
  if (budgetMin != null && budgetMax != null && budgetMin > budgetMax) {
    const swap = budgetMin;
    budgetMin = budgetMax;
    budgetMax = swap;
  }

  const ownerId = params.get("ownerId")?.trim() ?? "";
  const query = emptyLeadListQuery();
  query.followUps = readList<FollowUpFilter>(params, "followUp", FOLLOW_UPS);
  query.statuses = readList<LeadStatus>(params, "status", STATUSES);
  query.intents = readList<LeadIntent>(params, "intent", INTENTS);
  query.propertyTypes = canonicalPropertyTypes(
    params.getAll("propertyType").flatMap((value) => value.split(",")),
  );
  query.bhks = readList<LeadBhk>(params, "bhk", BHKS);
  query.constructionStatuses = readList(
    params,
    "construction",
    CONSTRUCTION,
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
