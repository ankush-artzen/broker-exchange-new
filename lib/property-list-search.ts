import {
  emptyPropertyListQuery,
  type PropertyListQuery,
  type PropertySort,
} from "./property-filters";

export function propertyListSearchParams(input: {
  query: PropertyListQuery;
  sort: PropertySort;
  ownerId?: string;
  name?: string;
}) {
  const params = new URLSearchParams();
  const append = (key: string, values: string[]) => {
    for (const value of values) {
      if (value) params.append(key, value);
    }
  };

  append("propertyType", input.query.propertyTypes);
  append("bhk", input.query.bhks);
  append("construction", input.query.constructionStatuses);
  append("availability", input.query.availability);

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

export function propertyListSearch(input?: {
  query?: PropertyListQuery;
  sort?: PropertySort;
  ownerId?: string;
  name?: string;
}) {
  if (!input) return "";
  return propertyListSearchParams({
    query: input.query ?? emptyPropertyListQuery(),
    sort: input.sort ?? "newest",
    ownerId: input.ownerId,
    name: input.name,
  }).toString();
}
