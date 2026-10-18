"use client";

import { ListingFiltersSheet } from "@/components/ListingFiltersSheet";
import {
  emptyLeadListQuery,
  hasLeadFilters,
  LEAD_SORTS,
  type LeadListQuery,
  type LeadSort,
} from "@/lib/lead-filters";

interface Props {
  query: LeadListQuery;
  sort: LeadSort;
  locations: string[];
  filtersOpen: boolean;
  onFiltersOpenChange: (open: boolean) => void;
  onQueryChange: (query: LeadListQuery) => void;
  onSortChange: (sort: LeadSort) => void;
}

export function LeadListControls({
  query,
  sort,
  locations,
  filtersOpen,
  onFiltersOpenChange,
  onQueryChange,
  onSortChange,
}: Props) {
  const filtersActive = hasLeadFilters(query);

  return (
    <div className="min-w-0">
      <label className="block">
        <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted">
          Sort
        </span>
        <select
          value={sort}
          onChange={(event) => onSortChange(event.target.value as LeadSort)}
          aria-label="Sort leads"
          className="w-full rounded-[10px] border border-border bg-surface px-3 py-2.5 text-sm text-primary outline-none focus:border-primary"
        >
          {LEAD_SORTS.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      {filtersActive && (
        <button
          type="button"
          onClick={() => onQueryChange(emptyLeadListQuery())}
          className="mt-1.5 text-[12.5px] font-medium text-muted underline"
        >
          Clear filters
        </button>
      )}

      <ListingFiltersSheet
        open={filtersOpen}
        query={query}
        locations={locations}
        listId="lead-location-options"
        onClose={() => onFiltersOpenChange(false)}
        onApply={(next) => {
          onQueryChange(next);
          onFiltersOpenChange(false);
        }}
      />
    </div>
  );
}
