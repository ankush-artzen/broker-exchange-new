"use client";

import { useEffect, useRef, useState } from "react";
import type { LeadFormData } from "@/lib/types";
// Temporary: AI parse-lead is off.
// import type { ParsedLead } from "@/lib/types";
// Temporary: remarks AI is off.
// import { api } from "@/lib/api";
import {
  cn,
  isValidIndianPhone,
  isValidPersonName,
  normalizeFollowUpInput,
  addDays,
  formatDateKey,
  toLocalDateKey,
  sanitizePersonName,
} from "@/lib/utils";
import {
  formatBudgetLabel,
  LEAD_STATUS_OPTIONS,
  LEAD_TEMPERATURES,
  leadBudgetInputs,
  normalizeLeadStatus,
  normalizeTemperature,
  parseBudgetRange,
  viewLead,
} from "@/lib/lead-filters";
// Temporary: AI parse-lead is off.
// import {
//   extractionFormPatch,
//   filledExtractionLabels,
// } from "@/lib/lead-ai";
import {
  normalizePlotSizeUnit,
  parseMeasureRange,
  requirementFieldErrors,
} from "@/lib/lead-requirements";
import { LeadRequirementFields } from "@/components/LeadRequirementFields";
import {
  fieldErrorBorder,
  fieldErrorText,
  formatMissingFieldsSummary,
  scrollToFirstFieldError,
  formErrorBanner,
} from "@/lib/form-errors";
import { PhoneField } from "@/components/PhoneField";
import { ButtonLoader } from "@/components/Loader";
import { CalendarDays } from "lucide-react";
// import { Sparkles } from "lucide-react";

const emptyLead: LeadFormData = {
  name: "",
  phone: "",
  requirement: "",
  location: "",
  budget: "",
  budgetMin: null,
  budgetMax: null,
  intent: "",
  category: "",
  propertyType: "",
  propertyTypes: [],
  bhk: "",
  bhks: [],
  constructionStatus: "",
  temperature: "",
  plotSize: "",
  plotSizeMin: null,
  plotSizeMax: null,
  plotSizeUnit: "",
  areaMin: null,
  areaMax: null,
  areaUnit: "",
  furnishing: "",
  floorPreference: "",
  facing: "",
  parking: "",
  amenities: [],
  purpose: "",
  homeLoan: "",
  possessionTimeline: "",
  locations: [],
  source: "",
  notes: "",
  remarks: "",
  followUpDate: "",
  status: "new",
};

function seedLead(initial?: Partial<LeadFormData>): LeadFormData {
  const viewed = viewLead({
    requirement: initial?.requirement,
    budget: initial?.budget,
    budgetMin: initial?.budgetMin,
    budgetMax: initial?.budgetMax,
    intent: initial?.intent,
    category: initial?.category,
    propertyType: initial?.propertyType,
    propertyTypes: initial?.propertyTypes,
    bhk: initial?.bhk,
    bhks: initial?.bhks,
    constructionStatus: initial?.constructionStatus,
    location: initial?.location,
    locations: initial?.locations,
  });
  const measured =
    initial?.plotSizeMin == null && initial?.plotSizeMax == null
      ? parseMeasureRange(initial?.plotSize)
      : {
          min: initial?.plotSizeMin ?? null,
          max: initial?.plotSizeMax ?? null,
          unit: normalizePlotSizeUnit(initial?.plotSizeUnit),
        };

  return {
    ...emptyLead,
    ...initial,
    intent: viewed.intent ?? "",
    category: viewed.category ?? "",
    propertyType: viewed.propertyType ?? "",
    propertyTypes: viewed.propertyTypes ?? [],
    bhk: viewed.bhk ?? "",
    bhks: viewed.bhks ?? [],
    constructionStatus: viewed.constructionStatus ?? "",
    locations: viewed.locations ?? [],
    location: viewed.location ?? "",
    temperature: normalizeTemperature(initial?.temperature) ?? "",
    plotSize: initial?.plotSize ?? "",
    plotSizeMin: measured.min,
    plotSizeMax: measured.max,
    plotSizeUnit: measured.unit ?? "",
    areaMin: initial?.areaMin ?? null,
    areaMax: initial?.areaMax ?? null,
    areaUnit: initial?.areaUnit ?? "",
    furnishing: initial?.furnishing ?? "",
    floorPreference: initial?.floorPreference ?? "",
    facing: initial?.facing ?? "",
    parking: initial?.parking ?? "",
    amenities: initial?.amenities ?? [],
    purpose: initial?.purpose ?? "",
    homeLoan: initial?.homeLoan ?? "",
    possessionTimeline: initial?.possessionTimeline ?? "",
    remarks: initial?.remarks ?? "",
    followUpDate: initial?.followUpDate
      ? toLocalDateKey(initial.followUpDate)
      : "",
    status: normalizeLeadStatus(initial?.status) ?? "new",
  };
}

interface Props {
  initial?: Partial<LeadFormData>;
  onSubmit: (data: LeadFormData) => Promise<void>;
  onCancel?: () => void;
  submitLabel?: string;
  variant?: "default" | "add";
}

export function LeadForm({
  initial,
  onSubmit,
  onCancel,
  submitLabel = "Save lead",
  variant = "default",
}: Props) {
  type LeadField = "name" | "phone" | "propertyTypes" | "bhks" | "locations" | "budget";

  const [form, setForm] = useState<LeadFormData>(() => seedLead(initial));
  const [minBudget, setMinBudget] = useState(
    () => leadBudgetInputs(initial ?? {}).min,
  );
  const [maxBudget, setMaxBudget] = useState(
    () => leadBudgetInputs(initial ?? {}).max,
  );
  // Temporary: remarks AI is off.
  // const [aiBusy, setAiBusy] = useState<"fill" | "remarks" | null>(null);
  // const [aiMessage, setAiMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<LeadField, string>>
  >({});

  useEffect(() => {
    setForm(seedLead(initial));
    const budgets = leadBudgetInputs(initial ?? {});
    setMinBudget(budgets.min);
    setMaxBudget(budgets.max);
  }, [initial]);

  const update = (field: keyof LeadFormData, value: string) => {
    const nextValue = field === "name" ? sanitizePersonName(value) : value;
    setForm((f) => ({ ...f, [field]: nextValue }));
    if (field in fieldErrors) {
      setFieldErrors((errors) => {
        const next = { ...errors };
        delete next[field as LeadField];
        return next;
      });
    }
    if (error) setError("");
  };

  const budgetNumbers = () => {
    let budgetMin = parseBudgetRange(minBudget).min;
    let budgetMax = parseBudgetRange(maxBudget).min;
    if (budgetMin != null && budgetMax != null && budgetMin > budgetMax) {
      const swap = budgetMin;
      budgetMin = budgetMax;
      budgetMax = swap;
    }
    return { budgetMin, budgetMax };
  };

  const validate = () => {
    const errors: Partial<Record<LeadField, string>> = {};
    const { budgetMin, budgetMax } = budgetNumbers();

    if (!form.name.trim()) {
      errors.name = "Name is required";
    } else if (!isValidPersonName(form.name)) {
      errors.name = "Name can only contain letters";
    }
    if (!form.phone.trim()) {
      errors.phone = "Phone is required";
    } else if (!isValidIndianPhone(form.phone)) {
      errors.phone = "Enter a valid 10-digit mobile number";
    }

    return {
      ...errors,
      ...requirementFieldErrors(
        {
          category: form.category,
          propertyTypes: form.propertyTypes,
          bhks: form.bhks,
          bhk: form.bhk,
          locations: form.locations,
          budgetMin,
          budgetMax,
        },
        true,
      ),
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const errors = validate();
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      const labels: Record<LeadField, string> = {
        name: "Name",
        phone: "Phone",
        propertyTypes: "Property type",
        bhks: "BHK",
        locations: "Location",
        budget: "Budget",
      };
      setError(
        formatMissingFieldsSummary(
          Object.keys(errors).map((key) => labels[key as LeadField]),
        ),
      );
      scrollToFirstFieldError();
      return;
    }

    setFieldErrors({});
    const followUpDate = normalizeFollowUpInput(form.followUpDate ?? "");
    const { budgetMin, budgetMax } = budgetNumbers();

    setLoading(true);
    try {
      await onSubmit({
        ...form,
        location: form.locations?.join(" · ") || form.location || "",
        budget: formatBudgetLabel(budgetMin, budgetMax),
        budgetMin,
        budgetMax,
        intent: form.intent || null,
        category: form.category || null,
        propertyType: form.propertyTypes?.[0] || null,
        propertyTypes: form.propertyTypes ?? [],
        bhk: form.bhks?.[0] || null,
        bhks: form.bhks ?? [],
        constructionStatus: form.constructionStatus || null,
        temperature: normalizeTemperature(form.temperature) || null,
        plotSizeMin: form.plotSizeMin,
        plotSizeMax: form.plotSizeMax,
        plotSizeUnit: form.plotSizeUnit || null,
        areaMin: form.areaMin,
        areaMax: form.areaMax,
        furnishing: form.furnishing || null,
        floorPreference: form.floorPreference || null,
        facing: form.facing || null,
        parking: form.parking || null,
        amenities: form.amenities ?? [],
        purpose: form.purpose || null,
        homeLoan: form.homeLoan || null,
        possessionTimeline: form.possessionTimeline || null,
        notes: form.notes ?? "",
        remarks: form.remarks ?? "",
        followUpDate,
        status: form.status ?? "new",
        explicitStructured: true,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setLoading(false);
    }
  };

  // Temporary: skip /api/ai/parse-lead. Notes stay as written; fields are not auto-filled.
  // const applyExtraction = (result: ParsedLead) => {
  //   const patch = extractionFormPatch(result);
  //   if (patch.name) patch.name = sanitizePersonName(patch.name);
  //   if (patch.followUpDate) patch.followUpDate = toLocalDateKey(patch.followUpDate);
  //   setForm((current) => ({ ...current, ...patch }));
  //   if (result.budget) {
  //     const budgets = leadBudgetInputs({ budget: result.budget });
  //     setMinBudget(budgets.min);
  //     setMaxBudget(budgets.max);
  //   }
  //   return filledExtractionLabels(result);
  // };
  //
  // const fillFromNotes = async () => {
  //   const text = form.notes?.trim() ?? "";
  //   if (!text) {
  //     setAiMessage("Write the lead in Notes first. Remarks stay separate.");
  //     return;
  //   }
  //   setAiBusy("fill");
  //   setAiMessage("");
  //   try {
  //     const result = await api.parseLead(text, "en-IN");
  //     const filled = applyExtraction(result);
  //     setAiMessage(
  //       filled.length
  //         ? `Filled ${filled.join(", ")}. Notes and remarks were kept.`
  //         : "Nothing specific was stated, so the other fields were left blank. Notes and remarks were kept.",
  //     );
  //   } catch (err) {
  //     setAiMessage(err instanceof Error ? err.message : "Could not read the notes");
  //   } finally {
  //     setAiBusy(null);
  //   }
  // };

  // Temporary: skip /api/ai/lead-remarks.
  // const suggestRemarks = async () => {
  //   setAiBusy("remarks");
  //   setAiMessage("");
  //   try {
  //     const { budgetMin, budgetMax } = budgetNumbers();
  //     const result = await api.suggestLeadRemarks({
  //       name: form.name,
  //       phone: form.phone,
  //       intent: form.intent,
  //       category: form.category,
  //       propertyType: form.propertyTypes?.[0],
  //       propertyTypes: form.propertyTypes,
  //       bhk: form.bhks?.[0],
  //       bhks: form.bhks,
  //       location: form.locations?.join(", ") || form.location,
  //       locations: form.locations,
  //       budget: formatBudgetLabel(budgetMin, budgetMax),
  //       plotSize: form.plotSize,
  //       constructionStatus: form.constructionStatus,
  //       furnishing: form.furnishing,
  //       floorPreference: form.floorPreference,
  //       facing: form.facing,
  //       parking: form.parking,
  //       amenities: form.amenities,
  //       purpose: form.purpose,
  //       homeLoan: form.homeLoan,
  //       possessionTimeline: form.possessionTimeline,
  //       temperature: form.temperature,
  //       followUpDate: form.followUpDate,
  //       notes: form.notes,
  //       status: form.status,
  //     });
  //     setForm((current) => ({ ...current, remarks: result.remarks }));
  //     setAiMessage("Remarks added. Your notes were kept.");
  //   } catch (err) {
  //     setAiMessage(err instanceof Error ? err.message : "Could not write remarks");
  //   } finally {
  //     setAiBusy(null);
  //   }
  // };

  const isAdd = variant === "add";

  return (
    <form onSubmit={handleSubmit} className="space-y-3.5">
      {error && (
        <p className={formErrorBanner}>
          {error}
        </p>
      )}

      <Field
        label={isAdd ? "Name" : "Name *"}
        value={form.name}
        onChange={(v) => update("name", v)}
        placeholder={isAdd ? "Full name" : undefined}
        variant={variant}
        error={fieldErrors.name}
      />

      <PhoneField
        value={form.phone}
        onChange={(v) => update("phone", v)}
        label={isAdd ? "Phone" : "Phone *"}
        variant={variant}
        error={fieldErrors.phone}
      />

      <LeadRequirementFields
        variant={variant}
        minBudget={minBudget}
        maxBudget={maxBudget}
        onBudget={(side, value) => {
          if (side === "min") setMinBudget(value);
          else setMaxBudget(value);
          if (error) setError("");
          setFieldErrors((current) => {
            const next = { ...current };
            delete next.budget;
            return next;
          });
        }}
        errors={{
          propertyTypes: fieldErrors.propertyTypes,
          bhks: fieldErrors.bhks,
          locations: fieldErrors.locations,
          budget: fieldErrors.budget,
        }}
        values={{
          intent: form.intent ?? "",
          category: form.category ?? "",
          propertyTypes: form.propertyTypes ?? [],
          bhks: form.bhks ?? [],
          constructionStatus: form.constructionStatus ?? "",
          locations: form.locations ?? [],
          plotSizeMin: form.plotSizeMin ?? null,
          plotSizeMax: form.plotSizeMax ?? null,
          plotSizeUnit: form.plotSizeUnit ?? "",
          areaMin: form.areaMin ?? null,
          areaMax: form.areaMax ?? null,
          furnishing: form.furnishing ?? "",
          floorPreference: form.floorPreference ?? "",
          facing: form.facing ?? "",
          parking: form.parking ?? "",
          amenities: form.amenities ?? [],
          purpose: form.purpose ?? "",
          homeLoan: form.homeLoan ?? "",
          possessionTimeline: form.possessionTimeline ?? "",
        }}
        onChange={(patch) => {
          setForm((current) => ({ ...current, ...patch }));
          if (error) setError("");
          setFieldErrors((current) => {
            const next = { ...current };
            if (patch.propertyTypes) delete next.propertyTypes;
            if (patch.bhks) delete next.bhks;
            if (patch.locations) delete next.locations;
            return next;
          });
        }}
      />

      {!isAdd && (
        <Field
          label="Source"
          value={form.source ?? ""}
          onChange={(v) => update("source", v)}
          placeholder="Referral, portal..."
          variant={variant}
        />
      )}

      <div>
        <label className="mb-1.5 block text-xs font-semibold text-muted">
          Status
        </label>
        <div className="flex flex-wrap gap-2">
          {LEAD_STATUS_OPTIONS.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => update("status", option.id)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-[12.5px] font-medium transition-colors",
                (form.status ?? "new") === option.id
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-surface text-muted",
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-semibold text-muted">
          Lead temperature
        </label>
        <div className="flex flex-wrap gap-2">
          {LEAD_TEMPERATURES.map((option) => {
            const selected = form.temperature === option.id;
            return (
              <button
                key={option.id}
                type="button"
                onClick={() =>
                  update("temperature", selected ? "" : option.id)
                }
                className={cn(
                  "rounded-full border px-3 py-1.5 text-[12.5px] font-medium transition-colors",
                  selected
                    ? option.className
                    : "border-border bg-surface text-muted",
                )}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </div>

      <FollowUpDateField
        label={isAdd ? "Next follow-up" : "Follow-up date"}
        value={form.followUpDate ?? ""}
        onChange={(v) => update("followUpDate", v)}
        variant={variant}
      />

      <div className="space-y-3 rounded-[14px] border border-border bg-background p-3">
        <NotesField
          label="Notes"
          value={form.notes ?? ""}
          onChange={(v) => update("notes", v)}
          minRows={isAdd ? 2 : 3}
          placeholder="Write the lead in your own words"
          variant={variant}
        />
        {/* Temporary: AI parse-lead disabled.
        <button
          type="button"
          onClick={() => void fillFromNotes()}
          disabled={aiBusy !== null}
          className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 text-[12.5px] font-medium text-primary disabled:opacity-50"
        >
          <Sparkles size={14} />
          {aiBusy === "fill" ? "Reading notes…" : "Fill available fields"}
        </button>
        <p className="text-[12px] leading-relaxed text-muted">
          Uses only details written in the notes. Missing information stays blank.
        </p>
        */}

        {/* Temporary: Remarks and Suggest remarks are off.
        <NotesField
          label="Remarks"
          value={form.remarks ?? ""}
          onChange={(v) => update("remarks", v)}
          minRows={2}
          placeholder="A short note for the next follow-up"
          variant={variant}
        />
        <button
          type="button"
          onClick={() => void suggestRemarks()}
          disabled={aiBusy !== null}
          className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 text-[12.5px] font-medium text-primary disabled:opacity-50"
        >
          <Sparkles size={14} />
          {aiBusy === "remarks" ? "Writing remarks…" : "Suggest remarks"}
        </button>
        <p className="text-[12px] leading-relaxed text-muted">
          Remarks are saved with the notes. Suggesting remarks does not change the notes.
        </p>
        {aiMessage && (
          <p className="text-[12.5px] leading-relaxed text-primary">{aiMessage}</p>
        )}
        */}
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-xl bg-primary py-3.5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
      >
        {loading ? <ButtonLoader label="Saving…" /> : submitLabel}
      </button>

      {onCancel && (
        <button
          type="button"
          onClick={onCancel}
          className="w-full py-2 text-sm text-muted"
        >
          Cancel
        </button>
      )}
    </form>
  );
}

// function FollowUpDateField({
//   label,
//   value,
//   onChange,
//   variant = "default",
// }: {
//   label: string;
//   value: string;
//   onChange: (v: string) => void;
//   variant?: "default" | "add";
// }) {
//   const inputClass =
//     variant === "add"
//       ? "w-full rounded-[10px] border border-border bg-surface py-2.5 pl-3 pr-10 text-sm text-primary outline-none focus:border-primary [color-scheme:light]"
//       : "w-full rounded-xl border border-zinc-200 py-2.5 pl-3 pr-10 text-base outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 [color-scheme:light]";

//   const labelClass =
//     variant === "add"
//       ? "mb-1.5 block text-xs font-semibold text-muted"
//       : "mb-1 block text-sm font-medium text-zinc-700";

//   const shortcuts = [
//     { label: "Today", days: 0 },
//     { label: "Tomorrow", days: 1 },
//     { label: "3 days", days: 3 },
//     { label: "1 week", days: 7 },
//   ];

//   return (
//     <div>
//       <label className={labelClass}>{label}</label>
//       <div className="relative">
//         <input
//           type="date"
//           value={value}
//           onChange={(e) => onChange(e.target.value)}
//           className={inputClass}
//         />
//         <CalendarDays
//           size={18}
//           className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted"
//         />
//       </div>
//       <div className="mt-2 flex flex-wrap gap-2">
//         {shortcuts.map((opt) => {
//           const dateKey = formatDateKey(addDays(new Date(), opt.days));
//           const selected = value === dateKey;
//           return (
//             <button
//               key={opt.label}
//               type="button"
//               onClick={() => onChange(dateKey)}
//               className={cn(
//                 "rounded-full border px-3 py-1 text-[12px] font-medium transition-colors",
//                 selected
//                   ? "border-primary bg-primary text-primary-foreground"
//                   : "border-border bg-surface text-muted",
//               )}
//             >
//               {opt.label}
//             </button>
//           );
//         })}
//       </div>
//     </div>
//   );
// }
function FollowUpDateField({
  label,
  value,
  onChange,
  variant = "default",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  variant?: "default" | "add";
}) {
  const inputClass =
    variant === "add"
      ? "w-full rounded-[10px] border border-border bg-surface py-2.5 pl-3 pr-10 text-sm text-primary outline-none focus:border-primary [color-scheme:light]"
      : "w-full rounded-xl border border-zinc-200 py-2.5 pl-3 pr-10 text-base outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 [color-scheme:light]";

  const labelClass =
    variant === "add"
      ? "mb-1.5 block text-xs font-semibold text-muted"
      : "mb-1 block text-sm font-medium text-zinc-700";

  const shortcuts = [
    { label: "Today", days: 0 },
    { label: "Tomorrow", days: 1 },
    { label: "3 days", days: 3 },
    { label: "1 week", days: 7 },
  ];

  const getDateKey = (days: number) => formatDateKey(addDays(new Date(), days));

  return (
    <div>
      <label className={labelClass}>{label}</label>

      <div className="relative">
        <input
          type="date"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={inputClass}
        />

        <CalendarDays
          size={18}
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted"
        />
      </div>

      <div className="mt-2 flex flex-wrap gap-2">
        {shortcuts.map((opt) => {
          const dateKey = getDateKey(opt.days);
          const selected = value === dateKey;

          return (
            <button
              key={opt.label}
              type="button"
              onClick={() => onChange(dateKey)}
              className={cn(
                "rounded-full border px-3 py-1 text-[12px] font-medium transition-colors",
                selected
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-surface text-muted",
              )}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function NotesField({
  label,
  value,
  onChange,
  minRows,
  placeholder,
  variant = "default",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  minRows: number;
  placeholder?: string;
  variant?: "default" | "add";
}) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);

  const inputClass =
    variant === "add"
      ? "w-full resize-none overflow-hidden rounded-[10px] border border-border bg-surface px-3 py-2.5 text-sm leading-relaxed text-primary outline-none focus:border-primary"
      : "w-full resize-none overflow-hidden rounded-xl border border-zinc-200 px-3 py-2.5 text-base leading-relaxed outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100";

  const labelClass =
    variant === "add"
      ? "mb-1.5 block text-xs font-semibold text-muted"
      : "mb-1 block text-sm font-medium text-zinc-700";

  return (
    <div>
      <label className={labelClass}>{label}</label>
      <textarea
        ref={ref}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={minRows}
        placeholder={placeholder}
        className={inputClass}
      />
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  variant = "default",
  className,
  error,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  variant?: "default" | "add";
  className?: string;
  error?: string;
}) {
  const inputClass =
    variant === "add"
      ? "w-full rounded-[10px] border border-border bg-surface px-3 py-2.5 text-sm text-primary outline-none focus:border-primary"
      : "w-full rounded-xl border border-zinc-200 px-3 py-2.5 text-base outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100";

  const labelClass =
    variant === "add"
      ? "mb-1.5 block text-xs font-semibold text-muted"
      : "mb-1 block text-sm font-medium text-zinc-700";

  return (
    <div className={className} data-field-error={error ? "true" : undefined}>
      <label className={labelClass}>{label}</label>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className={cn(inputClass, error && fieldErrorBorder)}
      />
      {error && <p className={fieldErrorText}>{error}</p>}
    </div>
  );
}
