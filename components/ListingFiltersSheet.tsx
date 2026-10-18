"use client";

import { useEffect, useState, type ReactNode } from "react";
import { PriceField } from "@/components/PriceField";
import { Modal } from "@/components/Modal";
import {
  LEAD_BHK_OPTIONS,
  LEAD_CONSTRUCTION_STATUSES,
  LEAD_PROPERTY_TYPES,
  parseBudgetRange,
  rupeesToPriceInput,
  toggleValue,
  type LeadBhk,
} from "@/lib/lead-filters";
import { cn } from "@/lib/utils";

export interface DetailedListQuery {
  propertyTypes: string[];
  bhks: string[];
  location: string;
  budgetMin: number | null;
  budgetMax: number | null;
  constructionStatuses: string[];
  availability?: string[];
}

export function ListingFiltersSheet<T extends DetailedListQuery>({
  open,
  query,
  locations,
  listId,
  availabilityOptions,
  onClose,
  onApply,
}: {
  open: boolean;
  query: T;
  locations: string[];
  listId: string;
  availabilityOptions?: { id: string; label: string }[];
  onClose: () => void;
  onApply: (query: T) => void;
}) {
  const [propertyTypes, setPropertyTypes] = useState(query.propertyTypes);
  const [bhks, setBhks] = useState(query.bhks);
  const [constructionStatuses, setConstructionStatuses] = useState(
    query.constructionStatuses,
  );
  const [availability, setAvailability] = useState(query.availability ?? []);
  const [location, setLocation] = useState(query.location);
  const [minBudget, setMinBudget] = useState("");
  const [maxBudget, setMaxBudget] = useState("");

  useEffect(() => {
    if (!open) return;
    setPropertyTypes(query.propertyTypes);
    setBhks(query.bhks);
    setConstructionStatuses(query.constructionStatuses);
    setAvailability(query.availability ?? []);
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
      ...(availabilityOptions ? { availability } : {}),
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
      ...(availabilityOptions ? { availability: [] } : {}),
    });
  };

  const draftCount =
    propertyTypes.length +
    bhks.length +
    constructionStatuses.length +
    (availabilityOptions ? availability.length : 0) +
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

        {availabilityOptions && (
          <FilterSection label="Availability">
            <div className="flex flex-wrap gap-2">
              {availabilityOptions.map((option) => (
                <FilterChip
                  key={option.id}
                  label={option.label}
                  count={null}
                  pressed={availability.includes(option.id)}
                  onClick={() =>
                    setAvailability((current) => toggleValue(current, option.id))
                  }
                />
              ))}
            </div>
          </FilterSection>
        )}

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
            list={listId}
            placeholder="Search a location"
            onChange={(event) => setLocation(event.target.value)}
            className="w-full rounded-[10px] border border-border bg-surface px-3 py-2.5 text-sm text-primary outline-none focus:border-primary"
          />
          <datalist id={listId}>
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
