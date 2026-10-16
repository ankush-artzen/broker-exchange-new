import type { LeadListQuery, LeadSort } from "./lead-filters";

export function leadListSearchParams(input: {
  query: LeadListQuery;
  sort: LeadSort;
  ownerId?: string;
  name?: string;
}) {
  const params = new URLSearchParams();
  const append = (key: string, values: string[]) => {
    for (const value of values) {
      if (value) params.append(key, value);
    }
  };

  append("followUp", input.query.followUps);
  append("status", input.query.statuses);
  append("intent", input.query.intents);
  append("propertyType", input.query.propertyTypes);
  append("bhk", input.query.bhks);
  append("construction", input.query.constructionStatuses);

  const location = input.query.location.trim();
  if (location) params.set("location", location);
  if (input.query.budgetMin != null) {
    params.set("budgetMin", String(input.query.budgetMin));
  }
  if (input.query.budgetMax != null) {
    params.set("budgetMax", String(input.query.budgetMax));
  }

  params.set("sort", input.sort);
  const ownerId = input.ownerId?.trim();
  if (ownerId) params.set("ownerId", ownerId);
  const name = input.name?.trim();
  if (name) params.set("q", name);
  return params;
}
