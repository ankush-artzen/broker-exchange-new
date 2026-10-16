"use client";

import { useEffect, useState, type ReactNode } from "react";
import { SlidersHorizontal } from "lucide-react";
import { PriceField } from "@/components/PriceField";
import { Modal } from "@/components/Modal";
import {
  detailedFilterCount,
  emptyLeadListQuery,
  hasLeadFilters,
  LEAD_BHK_OPTIONS,
  LEAD_CONSTRUCTION_STATUSES,
  LEAD_INTENTS,
  LEAD_PROPERTY_TYPES,
  LEAD_SORTS,
  parseBudgetRange,
  rupeesToPriceInput,
  toggleValue,
  type LeadBhk,
  type LeadIntent,
  type LeadListQuery,
  type LeadSort,
} from "@/lib/lead-filters";
import { cn } from "@/lib/utils";

interface Props {
  query: LeadListQuery;
  sort: LeadSort;
  locations: string[];
  intentCounts: { buy: number; rent: number } | null;
  onQueryChange: (query: LeadListQuery) => void;
  onSortChange: (sort: LeadSort) => void;
}

export function LeadListControls({
  query,
  sort,
  locations,
  intentCounts,
  onQueryChange,
  onSortChange,
}: Props) {
  const [filtersOpen, setFiltersOpen] = useState(false);
  const detailCount = detailedFilterCount(query);
  const filtersActive = hasLeadFilters(query);

  return (
    <div className="mb-4 min-w-0 space-y-3">
      <div className="flex min-w-0 gap-2 overflow-x-auto pb-1">
        {/* <ChipGroup>
          {FOLLOW_UP_FILTERS.map((chip) => (
            <FilterChip
              key={chip.id}
              label={chip.label}
              count={countFor({ ...query, followUps: [chip.id] })}
              pressed={query.followUps.includes(chip.id)}
              onClick={() =>
                onQueryChange({
                  ...query,
                  followUps: toggleValue(query.followUps, chip.id),
                })
              }
            />
          ))}
        </ChipGroup> */}
        <span className="w-px shrink-0 self-stretch bg-border" aria-hidden />
        {/* <ChipGroup>
          {LEAD_STATUS_OPTIONS.map((chip) => (
            <FilterChip
              key={chip.id}
              label={chip.label}
              count={countFor({
                ...query,
                statuses: [chip.id as LeadStatus],
              })}
              pressed={query.statuses.includes(chip.id)}
              onClick={() =>
                onQueryChange({
                  ...query,
                  statuses: toggleValue(
                    query.statuses,
                    chip.id as LeadStatus,
                  ),
                })
              }
            />
          ))}
        </ChipGroup> */}
        <span className="w-px shrink-0 self-stretch bg-border" aria-hidden />
        <ChipGroup>
          {LEAD_INTENTS.map((chip) => (
            <FilterChip
              key={chip.id}
              label={chip.label}
              count={intentCounts ? intentCounts[chip.id] : null}
              pressed={query.intents.includes(chip.id)}
              onClick={() =>
                onQueryChange({
                  ...query,
                  intents: toggleValue(query.intents, chip.id as LeadIntent),
                })
              }
            />
          ))}
        </ChipGroup>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setFiltersOpen(true)}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-[12.5px] font-medium transition-colors",
            detailCount > 0
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border bg-surface text-primary",
          )}
        >
          <SlidersHorizontal size={14} />
          Filters
          {detailCount > 0 && (
            <span className="rounded-full bg-primary-foreground/20 px-1.5 text-[11px] tabular-nums">
              {detailCount}
            </span>
          )}
        </button>

        <label className="inline-flex min-w-0 flex-1 items-center gap-2 sm:flex-none">
          <span className="shrink-0 text-[12px] font-semibold text-muted">
            Sort
          </span>
          <select
            value={sort}
            onChange={(event) => onSortChange(event.target.value as LeadSort)}
            aria-label="Sort leads"
            className="min-w-0 flex-1 rounded-[10px] border border-border bg-surface px-2.5 py-1.5 text-[12.5px] text-primary outline-none focus:border-primary sm:w-52 sm:flex-none"
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
            className="px-1 text-[12.5px] font-medium text-muted underline"
          >
            Clear filters
          </button>
        )}
      </div>

      <LeadFiltersSheet
        open={filtersOpen}
        query={query}
        locations={locations}
        onClose={() => setFiltersOpen(false)}
        onApply={(next) => {
          onQueryChange(next);
          setFiltersOpen(false);
        }}
      />
    </div>
  );
}

function ChipGroup({ children }: { children: ReactNode }) {
  return <div className="flex shrink-0 gap-2">{children}</div>;
}

function FilterChip({
  label,
  count,
  pressed,
  onClick,
}: {
  label: string;
  count: number | null;
  pressed: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-[12.5px] font-medium transition-colors",
        pressed
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-surface text-muted",
      )}
    >
      {label}
      {count != null && (
        <span className={cn("tabular-nums", pressed ? "text-primary-foreground/80" : "text-muted")}>
          {count}
        </span>
      )}
    </button>
  );
}

function LeadFiltersSheet({
  open,
  query,
  locations,
  onClose,
  onApply,
}: {
  open: boolean;
  query: LeadListQuery;
  locations: string[];
  onClose: () => void;
  onApply: (query: LeadListQuery) => void;
}) {
  const [propertyTypes, setPropertyTypes] = useState(query.propertyTypes);
  const [bhks, setBhks] = useState(query.bhks);
  const [constructionStatuses, setConstructionStatuses] = useState(
    query.constructionStatuses,
  );
  const [location, setLocation] = useState(query.location);
  const [minBudget, setMinBudget] = useState("");
  const [maxBudget, setMaxBudget] = useState("");

  useEffect(() => {
    if (!open) return;
    setPropertyTypes(query.propertyTypes);
    setBhks(query.bhks);
    setConstructionStatuses(query.constructionStatuses);
    setLocation(query.location);
    setMinBudget(query.budgetMin != null ? rupeesToPriceInput(query.budgetMin) : "");
    setMaxBudget(query.budgetMax != null ? rupeesToPriceInput(query.budgetMax) : "");
  }, [open, query]);

  const apply = () => {
    let budgetMin = parseBudgetRange(minBudget).min;
    let budgetMax = parseBudgetRange(maxBudget).min;
    if (budgetMin != null && budgetMax != null && budgetMin > budgetMax) {
      const swap = budgetMin;
      budgetMin = budgetMax;
      budgetMax = swap;
    }
    onApply({
      ...query,
      propertyTypes,
      bhks,
      constructionStatuses,
      location: location.trim(),
      budgetMin,
      budgetMax,
    });
  };

  const clearDetailed = () => {
    onApply({
      ...query,
      propertyTypes: [],
      bhks: [],
      location: "",
      budgetMin: null,
      budgetMax: null,
      constructionStatuses: [],
    });
  };

  const draftCount =
    propertyTypes.length +
    bhks.length +
    constructionStatuses.length +
    (location.trim() ? 1 : 0) +
    (minBudget.trim() ? 1 : 0) +
    (maxBudget.trim() ? 1 : 0);

  return (
    <Modal open={open} onClose={onClose} title="Filters">
      <div className="space-y-4">
        <p className="text-[12.5px] text-muted">
          {draftCount > 0
            ? `${draftCount} detailed ${draftCount === 1 ? "filter" : "filters"} selected`
            : "No detailed filters selected"}
        </p>

        <FilterSection label="Property type">
          <div className="flex flex-wrap gap-2">
            {LEAD_PROPERTY_TYPES.map((option) => (
              <FilterChip
                key={option.id}
                label={option.label}
                count={null}
                pressed={propertyTypes.includes(option.id)}
                onClick={() =>
                  setPropertyTypes((current) => toggleValue(current, option.id))
                }
              />
            ))}
          </div>
        </FilterSection>

        <FilterSection label="BHK">
          <div className="flex flex-wrap gap-2">
            {LEAD_BHK_OPTIONS.map((option) => (
              <FilterChip
                key={option.id}
                label={option.label}
                count={null}
                pressed={bhks.includes(option.id)}
                onClick={() =>
                  setBhks((current) => toggleValue(current, option.id as LeadBhk))
                }
              />
            ))}
          </div>
        </FilterSection>

        <FilterSection label="Location">
          <input
            value={location}
            list="lead-location-options"
            placeholder="Search a location"
            onChange={(event) => setLocation(event.target.value)}
            className="w-full rounded-[10px] border border-border bg-surface px-3 py-2.5 text-sm text-primary outline-none focus:border-primary"
          />
          <datalist id="lead-location-options">
            {locations.map((option) => (
              <option key={option} value={option} />
            ))}
          </datalist>
        </FilterSection>

        <FilterSection label="Budget">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <PriceField
              value={minBudget}
              onChange={setMinBudget}
              label="Minimum"
              variant="add"
            />
            <PriceField
              value={maxBudget}
              onChange={setMaxBudget}
              label="Maximum"
              variant="add"
            />
          </div>
        </FilterSection>

        <FilterSection label="Construction status">
          <div className="flex flex-wrap gap-2">
            {LEAD_CONSTRUCTION_STATUSES.map((option) => (
              <FilterChip
                key={option.id}
                label={option.label}
                count={null}
                pressed={constructionStatuses.includes(option.id)}
                onClick={() =>
                  setConstructionStatuses((current) =>
                    toggleValue(current, option.id),
                  )
                }
              />
            ))}
          </div>
        </FilterSection>

        <div className="flex flex-col gap-2 border-t border-border pt-4">
          <button
            type="button"
            onClick={apply}
            className="w-full rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground"
          >
            Apply Filters
          </button>
          <button
            type="button"
            onClick={clearDetailed}
            className="w-full py-2 text-sm font-medium text-muted"
          >
            Clear All
          </button>
        </div>
      </div>
    </Modal>
  );
}

function FilterSection({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <section>
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
        {label}
      </h3>
      {children}
    </section>
  );
}
