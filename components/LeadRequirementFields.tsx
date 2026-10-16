"use client";

import { useRef, useState } from "react";
import { ChevronDown, MapPin, X } from "lucide-react";
import { LocationPicker } from "@/components/LocationPicker";
import { PriceField } from "@/components/PriceField";
import { fieldErrorText } from "@/lib/form-errors";
import {
  LEAD_BHK_OPTIONS,
  LEAD_CONSTRUCTION_STATUSES,
  LEAD_INTENTS,
} from "@/lib/lead-filters";
import {
  LEAD_AMENITY_OPTIONS,
  LEAD_CATEGORIES,
  LEAD_FACING_OPTIONS,
  LEAD_FLOOR_PREFERENCES,
  LEAD_FURNISHING_OPTIONS,
  LEAD_HOME_LOAN_OPTIONS,
  LEAD_PARKING_OPTIONS,
  LEAD_POSSESSION_TIMELINES,
  LEAD_PURPOSE_OPTIONS,
  PLOT_SIZE_UNITS,
  propertyTypesForCategory,
  requirementShape,
  type LeadCategory,
} from "@/lib/lead-requirements";
import { cn } from "@/lib/utils";

export interface RequirementValues {
  intent: string;
  category: string;
  propertyTypes: string[];
  bhks: string[];
  constructionStatus: string;
  locations: string[];
  plotSizeMin: number | null;
  plotSizeMax: number | null;
  plotSizeUnit: string;
  areaMin: number | null;
  areaMax: number | null;
  furnishing: string;
  floorPreference: string;
  facing: string;
  parking: string;
  amenities: string[];
  purpose: string;
  homeLoan: string;
  possessionTimeline: string;
}

interface Props {
  values: RequirementValues;
  variant?: "default" | "add";
  errors?: Partial<Record<"propertyTypes" | "bhks" | "locations" | "budget", string>>;
  minBudget: string;
  maxBudget: string;
  onBudget: (side: "min" | "max", value: string) => void;
  onChange: (patch: Partial<RequirementValues>) => void;
}

const FACING_LABELS: Record<string, string> = {
  north: "North",
  south: "South",
  east: "East",
  west: "West",
  "north-east": "North-East",
  "north-west": "North-West",
  "south-east": "South-East",
  "south-west": "South-West",
};

function toggleItem(values: string[], value: string) {
  return values.includes(value)
    ? values.filter((item) => item !== value)
    : [...values, value];
}

export function LeadRequirementFields({
  values,
  variant = "default",
  errors,
  minBudget,
  maxBudget,
  onBudget,
  onChange,
}: Props) {
  const labelClass =
    variant === "add"
      ? "mb-1.5 block text-xs font-semibold text-muted"
      : "mb-1 block text-sm font-medium text-zinc-700";
  const stash = useRef<Partial<Record<LeadCategory, string[]>>>({});
  const [typesOpen, setTypesOpen] = useState(false);
  const [mapOpen, setMapOpen] = useState(false);
  const [areaDraft, setAreaDraft] = useState("");
  const [preferencesOpen, setPreferencesOpen] = useState(
    () =>
      Boolean(
        values.furnishing ||
          values.floorPreference ||
          values.facing ||
          values.parking ||
          values.amenities.length ||
          values.purpose ||
          values.homeLoan ||
          values.possessionTimeline,
      ),
  );

  const typeOptions = propertyTypesForCategory(values.category);
  const shape = requirementShape(values.propertyTypes);
  const selectedLabels = typeOptions
    .filter((option) => values.propertyTypes.includes(option.id))
    .map((option) => option.label);

  const chooseCategory = (next: string) => {
    if (values.category === next) {
      if (next === "residential" || next === "commercial") {
        stash.current[next] = values.propertyTypes;
      }
      onChange({ category: "", propertyTypes: [] });
      setTypesOpen(false);
      return;
    }
    if (values.category === "residential" || values.category === "commercial") {
      stash.current[values.category] = values.propertyTypes;
    }
    const restored =
      next === "residential" || next === "commercial"
        ? (stash.current[next] ?? [])
        : [];
    onChange({ category: next, propertyTypes: restored });
    setTypesOpen(true);
  };

  const addLocation = (value: string) => {
    const next = value.trim();
    if (!next || values.locations.length >= 3) return;
    if (values.locations.some((item) => item.toLowerCase() === next.toLowerCase())) {
      setAreaDraft("");
      return;
    }
    onChange({ locations: [...values.locations, next] });
    setAreaDraft("");
  };

  return (
    <div className="space-y-3.5">
      <div>
        <p className={labelClass}>Buy / Rent</p>
        <div className="flex flex-wrap gap-2">
          {LEAD_INTENTS.map((option) => (
            <Chip
              key={option.id}
              pressed={values.intent === option.id}
              onClick={() =>
                onChange({ intent: values.intent === option.id ? "" : option.id })
              }
            >
              {option.label}
            </Chip>
          ))}
        </div>
      </div>

      <div>
        <p className={labelClass}>Category</p>
        <div className="flex flex-wrap gap-2">
          {LEAD_CATEGORIES.map((option) => (
            <Chip
              key={option.id}
              pressed={values.category === option.id}
              onClick={() => chooseCategory(option.id)}
            >
              {option.label}
            </Chip>
          ))}
        </div>
      </div>

      <div data-field-error={errors?.propertyTypes ? "true" : undefined}>
        <p className={labelClass}>Property type *</p>
        <button
          type="button"
          disabled={!values.category}
          aria-expanded={typesOpen}
          onClick={() => setTypesOpen((open) => !open)}
          className={cn(
            "flex w-full items-center justify-between gap-2 rounded-[10px] border bg-surface px-3 py-2.5 text-left text-sm",
            errors?.propertyTypes ? "border-red-500" : "border-border",
            values.category ? "text-primary" : "text-muted",
          )}
        >
          <span className="min-w-0 truncate">
            {selectedLabels.length
              ? selectedLabels.join(", ")
              : values.category
                ? "Select property types"
                : "Choose a category first"}
          </span>
          <ChevronDown size={16} className="shrink-0 text-muted" />
        </button>
        {typesOpen && values.category && (
          <div className="mt-2 max-h-64 space-y-1 overflow-auto rounded-[10px] border border-border bg-surface p-2">
            {typeOptions.map((option) => {
              const checked = values.propertyTypes.includes(option.id);
              return (
                <label
                  key={option.id}
                  className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-2 text-sm text-primary hover:bg-background"
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() =>
                      onChange({
                        propertyTypes: toggleItem(values.propertyTypes, option.id),
                      })
                    }
                    className="size-4 accent-primary"
                  />
                  <span>{option.label}</span>
                </label>
              );
            })}
          </div>
        )}
        {errors?.propertyTypes && (
          <p className={fieldErrorText}>{errors.propertyTypes}</p>
        )}
      </div>

      {shape.needsBhk && (
        <div data-field-error={errors?.bhks ? "true" : undefined}>
          <p className={labelClass}>BHK *</p>
          <div className="flex flex-wrap gap-2">
            {LEAD_BHK_OPTIONS.map((option) => (
              <Chip
                key={option.id}
                pressed={values.bhks.includes(option.id)}
                onClick={() =>
                  onChange({ bhks: toggleItem(values.bhks, option.id) })
                }
              >
                {option.label}
              </Chip>
            ))}
          </div>
          {errors?.bhks && <p className={fieldErrorText}>{errors.bhks}</p>}
        </div>
      )}

      {shape.needsPlotSize && (
        <MeasureRange
          label="Size"
          min={values.plotSizeMin}
          max={values.plotSizeMax}
          onMin={(plotSizeMin) =>
            onChange({
              plotSizeMin,
              plotSizeUnit: values.plotSizeUnit || "sq-yd",
            })
          }
          onMax={(plotSizeMax) =>
            onChange({
              plotSizeMax,
              plotSizeUnit: values.plotSizeUnit || "sq-yd",
            })
          }
          units={PLOT_SIZE_UNITS}
          unit={values.plotSizeUnit || "sq-yd"}
          onUnit={(plotSizeUnit) => onChange({ plotSizeUnit })}
        />
      )}

      {shape.needsArea && (
        <MeasureRange
          label="Area (sq. ft.)"
          min={values.areaMin}
          max={values.areaMax}
          onMin={(areaMin) => onChange({ areaMin })}
          onMax={(areaMax) => onChange({ areaMax })}
        />
      )}

      <div>
        <p className={labelClass}>Construction status</p>
        <div className="flex flex-wrap gap-2">
          {LEAD_CONSTRUCTION_STATUSES.map((option) => (
            <Chip
              key={option.id}
              pressed={values.constructionStatus === option.id}
              onClick={() =>
                onChange({
                  constructionStatus:
                    values.constructionStatus === option.id ? "" : option.id,
                })
              }
            >
              {option.label}
            </Chip>
          ))}
        </div>
      </div>

      <div data-field-error={errors?.locations ? "true" : undefined}>
        <p className={labelClass}>Location * <span className="font-normal">1–3 areas</span></p>
        {values.locations.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-2">
            {values.locations.map((area) => (
              <span
                key={area}
                className="inline-flex max-w-full items-center gap-1 rounded-full border border-primary bg-primary px-3 py-1 text-[12.5px] font-medium text-primary-foreground"
              >
                <span className="truncate">{area}</span>
                <button
                  type="button"
                  aria-label={`Remove ${area}`}
                  onClick={() =>
                    onChange({
                      locations: values.locations.filter((item) => item !== area),
                    })
                  }
                  className="shrink-0"
                >
                  <X size={13} />
                </button>
              </span>
            ))}
          </div>
        )}
        <div className="flex gap-2">
          <input
            value={areaDraft}
            onChange={(event) => setAreaDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                addLocation(areaDraft);
              }
            }}
            disabled={values.locations.length >= 3}
            placeholder={
              values.locations.length >= 3 ? "3 areas added" : "Sector, area, or city"
            }
            className={cn(
              "min-w-0 flex-1 rounded-[10px] border bg-surface px-3 py-2.5 text-sm text-primary outline-none focus:border-primary",
              errors?.locations ? "border-red-500" : "border-border",
            )}
          />
          <button
            type="button"
            onClick={() => addLocation(areaDraft)}
            disabled={!areaDraft.trim() || values.locations.length >= 3}
            className="shrink-0 rounded-[10px] border border-border px-3 text-sm font-medium text-primary disabled:opacity-40"
          >
            Add
          </button>
        </div>
        <button
          type="button"
          onClick={() => setMapOpen((open) => !open)}
          className="mt-2 inline-flex items-center gap-1.5 text-[12.5px] font-medium text-primary"
        >
          <MapPin size={14} />
          {mapOpen ? "Hide map" : "Pick on map"}
        </button>
        {mapOpen && (
          <div className="mt-2">
            <LocationPicker
              value=""
              label="Add from map"
              onChange={(next) => {
                if (next.trim()) addLocation(next);
              }}
            />
          </div>
        )}
        {errors?.locations && <p className={fieldErrorText}>{errors.locations}</p>}
      </div>

      <div data-field-error={errors?.budget ? "true" : undefined}>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <PriceField
            value={minBudget}
            onChange={(value) => onBudget("min", value)}
            label="Min budget *"
            variant={variant}
            invalid={Boolean(errors?.budget)}
          />
          <PriceField
            value={maxBudget}
            onChange={(value) => onBudget("max", value)}
            label="Max budget *"
            variant={variant}
            invalid={Boolean(errors?.budget)}
            error={errors?.budget}
          />
        </div>
      </div>

      <div className="rounded-[14px] border border-border bg-background">
        <button
          type="button"
          onClick={() => setPreferencesOpen((open) => !open)}
          className="flex w-full items-center justify-between px-3 py-2.5 text-left text-sm font-medium text-primary"
        >
          More preferences
          <span className="text-[12px] font-normal text-muted">Optional</span>
        </button>
        {preferencesOpen && (
          <div className="space-y-3 border-t border-border px-3 py-3">
            <ChoiceRow
              label="Furnishing"
              options={LEAD_FURNISHING_OPTIONS}
              value={values.furnishing}
              onChange={(furnishing) => onChange({ furnishing })}
            />
            <ChoiceRow
              label="Floor"
              options={LEAD_FLOOR_PREFERENCES}
              value={values.floorPreference}
              onChange={(floorPreference) => onChange({ floorPreference })}
            />
            <label className="block">
              <span className={labelClass}>Facing</span>
              <select
                value={values.facing}
                onChange={(event) => onChange({ facing: event.target.value })}
                className="w-full rounded-[10px] border border-border bg-surface px-3 py-2.5 text-sm text-primary outline-none focus:border-primary"
              >
                <option value="">Any facing</option>
                {LEAD_FACING_OPTIONS.map((option) => (
                  <option key={option.id} value={option.id}>
                    {FACING_LABELS[option.id] ?? option.label}
                  </option>
                ))}
              </select>
            </label>
            <ChoiceRow
              label="Parking"
              options={LEAD_PARKING_OPTIONS}
              value={values.parking}
              onChange={(parking) => onChange({ parking })}
            />
            <div>
              <p className={labelClass}>Must-have amenities</p>
              <div className="flex flex-wrap gap-2">
                {LEAD_AMENITY_OPTIONS.map((option) => (
                  <Chip
                    key={option.id}
                    pressed={values.amenities.includes(option.id)}
                    onClick={() =>
                      onChange({
                        amenities: toggleItem(values.amenities, option.id),
                      })
                    }
                  >
                    {option.label}
                  </Chip>
                ))}
              </div>
            </div>
            <ChoiceRow
              label="Purpose"
              options={LEAD_PURPOSE_OPTIONS}
              value={values.purpose}
              onChange={(purpose) => onChange({ purpose })}
            />
            <ChoiceRow
              label="Home loan"
              options={LEAD_HOME_LOAN_OPTIONS}
              value={values.homeLoan}
              onChange={(homeLoan) => onChange({ homeLoan })}
            />
            <ChoiceRow
              label="Possession timeline"
              options={LEAD_POSSESSION_TIMELINES}
              value={values.possessionTimeline}
              onChange={(possessionTimeline) => onChange({ possessionTimeline })}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function ChoiceRow({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: readonly { id: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <p className="mb-1.5 block text-xs font-semibold text-muted">{label}</p>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <Chip
            key={option.id}
            pressed={value === option.id}
            onClick={() => onChange(value === option.id ? "" : option.id)}
          >
            {option.label}
          </Chip>
        ))}
      </div>
    </div>
  );
}

function MeasureRange({
  label,
  min,
  max,
  onMin,
  onMax,
  units,
  unit,
  onUnit,
}: {
  label: string;
  min: number | null;
  max: number | null;
  onMin: (value: number | null) => void;
  onMax: (value: number | null) => void;
  units?: readonly { id: string; label: string }[];
  unit?: string;
  onUnit?: (value: string) => void;
}) {
  return (
    <div>
      <p className="mb-1.5 block text-xs font-semibold text-muted">{label}</p>
      <div className="grid grid-cols-2 gap-2">
        <input
          type="number"
          inputMode="decimal"
          min="0"
          step="any"
          value={min ?? ""}
          placeholder="Min"
          onChange={(event) => onMin(readMeasure(event.target.value))}
          className="w-full rounded-[10px] border border-border bg-surface px-3 py-2.5 text-sm text-primary outline-none focus:border-primary"
        />
        <input
          type="number"
          inputMode="decimal"
          min="0"
          step="any"
          value={max ?? ""}
          placeholder="Max"
          onChange={(event) => onMax(readMeasure(event.target.value))}
          className="w-full rounded-[10px] border border-border bg-surface px-3 py-2.5 text-sm text-primary outline-none focus:border-primary"
        />
      </div>
      {units && onUnit && (
        <div className="mt-2 flex flex-wrap gap-2">
          {units.map((option) => (
            <Chip
              key={option.id}
              pressed={unit === option.id}
              onClick={() => onUnit(option.id)}
            >
              {option.label}
            </Chip>
          ))}
        </div>
      )}
    </div>
  );
}

function readMeasure(value: string): number | null {
  if (!value.trim()) return null;
  const amount = Number(value);
  return Number.isFinite(amount) && amount > 0 ? amount : null;
}

function Chip({
  pressed,
  onClick,
  children,
}: {
  pressed: boolean;
  onClick: () => void;
  children: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border px-3 py-1.5 text-[12.5px] font-medium transition-colors",
        pressed
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-surface text-muted",
      )}
    >
      {children}
    </button>
  );
}
