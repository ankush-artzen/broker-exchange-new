"use client";

import { ListingFiltersSheet } from "@/components/ListingFiltersSheet";
import {
  emptyPropertyListQuery,
  hasPropertyFilters,
  PROPERTY_AVAILABILITY,
  PROPERTY_SORTS,
  type PropertyListQuery,
  type PropertySort,
} from "@/lib/property-filters";

interface Props {
  query: PropertyListQuery;
  sort: PropertySort;
  locations: string[];
  filtersOpen: boolean;
  onFiltersOpenChange: (open: boolean) => void;
  onQueryChange: (query: PropertyListQuery) => void;
  onSortChange: (sort: PropertySort) => void;
}

export function PropertyListControls({
  query,
  sort,
  locations,
  filtersOpen,
  onFiltersOpenChange,
  onQueryChange,
  onSortChange,
}: Props) {
  const filtersActive = hasPropertyFilters(query);

  return (
    <div className="min-w-0">
      <label className="block">
        <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted">
          Sort
        </span>
        <select
          value={sort}
          onChange={(event) => onSortChange(event.target.value as PropertySort)}
          aria-label="Sort properties"
          className="w-full rounded-[10px] border border-border bg-surface px-3 py-2.5 text-sm text-primary outline-none focus:border-primary"
        >
          {PROPERTY_SORTS.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      {filtersActive && (
        <button
          type="button"
          onClick={() => onQueryChange(emptyPropertyListQuery())}
          className="mt-1.5 text-[12.5px] font-medium text-muted underline"
        >
          Clear filters
        </button>
      )}

      <ListingFiltersSheet
        open={filtersOpen}
        query={query}
        locations={locations}
        listId="property-location-options"
        availabilityOptions={PROPERTY_AVAILABILITY.map((option) => ({
          id: option.id,
          label: option.label,
        }))}
        onClose={() => onFiltersOpenChange(false)}
        onApply={(next) => {
          onQueryChange(next);
          onFiltersOpenChange(false);
        }}
      />
    </div>
  );
}
