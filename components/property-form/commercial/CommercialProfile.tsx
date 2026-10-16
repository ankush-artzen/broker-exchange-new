"use client";

import { useState } from "react";
import { CircleAlert } from "lucide-react";
import { amountInWords } from "@/lib/price";
import { POSSESSION_OPTIONS, QUALITY_RATING_OPTIONS, YES_NO_OPTIONS } from "@/lib/constants/property";
import { cn } from "@/lib/utils";
import { ProfileAreaFields } from "@/components/property-form/area";
import { areaKind, areaRequirementHint, pricingBasis } from "@/lib/listing-shape";
import { Choices, Field, fieldClass } from "@/components/property-form/fields";
import { PriceOptionFields } from "@/components/property-form/price-options";
import { formatRent, rentDigits } from "@/components/property-form/helpers";
import { RateReadout } from "@/components/property-form/price-details";
import { FieldMessage, SectionMessage } from "@/components/property-form/messages";
import type { ListingChange, ListingDraft } from "@/components/property-form/types";

const WASHROOM_OPTIONS = [
  { id: "none", label: "None" },
  { id: "shared", label: "Shared" },
  { id: "1", label: "1" },
  { id: "2", label: "2" },
  { id: "3", label: "3" },
  { id: "4", label: "4" },
] as const;

export function CommercialProfile({
  form,
  onChange,
  areaError,
  priceError,
  rentError,
}: {
  form: ListingDraft;
  onChange: ListingChange;
  areaError?: string;
  priceError?: string;
  rentError?: string;
}) {
  const [leaseExtras, setLeaseExtras] = useState(
    Boolean(form.annualRentIncrement.trim() || form.leasedTo.trim()),
  );
  const words = amountInWords(form.price);
  const kind = areaKind(form);
  const basis = pricingBasis(form);
  const washroomCustom =
    form.bathrooms !== "" && !WASHROOM_OPTIONS.some((option) => option.id === form.bathrooms);
  const [otherWashrooms, setOtherWashrooms] = useState(washroomCustom);

  return (
    <>
      <div data-field-error={areaError ? "true" : undefined}>
        <SectionMessage title="Add Area Details" hint={areaRequirementHint(form)} />
        <div className="mt-3">
          <ProfileAreaFields
            kind={kind}
            carpetArea={form.carpetArea}
            plotArea={form.plotArea}
            builtUpArea={form.builtUpArea}
            superBuiltUpArea={form.superBuiltUpArea}
            onChange={onChange}
          />
        </div>
        {areaError ? <FieldMessage>{areaError}</FieldMessage> : null}
      </div>

      <div>
        <SectionMessage title="Add Room Details" />
        <div className="mt-3">
          <Choices
            label="No. of Washrooms"
            value={washroomCustom ? "" : form.bathrooms}
            options={WASHROOM_OPTIONS}
            onChange={(value) => {
              setOtherWashrooms(false);
              onChange("bathrooms", value);
            }}
          />
          <button
            type="button"
            onClick={() => setOtherWashrooms(true)}
            className="mt-2 text-sm font-medium text-primary"
          >
            + Add other
          </button>
          {otherWashrooms && (
            <input
              type="number"
              inputMode="numeric"
              min={5}
              value={washroomCustom ? form.bathrooms : ""}
              placeholder="Enter number"
              aria-label="Other washrooms"
              onChange={(e) => onChange("bathrooms", e.target.value.replace(/[^\d]/g, ""))}
              className={cn(fieldClass, "mt-2")}
            />
          )}
        </div>
      </div>

      <Choices
        label="Availability Status"
        value={form.possession}
        options={POSSESSION_OPTIONS}
        onChange={(value) => onChange("possession", value)}
        columns={2}
      />

      {form.hospitalityType === "Hotel"  || form.hospitalityType ==="Resort" && (
        <>
        <Choices
          label="Quality Rating"
          value={form.qualityRating}
            options={QUALITY_RATING_OPTIONS}
            onChange={(value) => onChange("qualityRating", value)}
          />
        </>
      )}

      {form.intent === "rent" && (
        <Field
          label="Available from"
          value={form.availableFrom}
          onChange={(value) => onChange("availableFrom", value)}
          type="date"
        />
      )}

      <div data-field-error={priceError ? "true" : undefined}>
        <SectionMessage title="Price Details" />
        <div className="mt-3 grid grid-cols-2 items-start gap-2">
          <div>
            <div
              className={cn(
                "rounded-xl border bg-background px-3 py-2.5",
                priceError
                  ? "border-red-500"
                  : "border-border focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/25",
              )}
            >
              {priceError ? (
                <p className="mb-0.5 text-[12px] leading-tight text-red-600">{priceError}</p>
              ) : null}
              <div className="flex items-center gap-1.5">
                <span className="text-base text-muted">₹</span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={rentDigits(form.price)}
                  placeholder="Expected Price"
                  aria-label="Expected Price"
                  aria-invalid={priceError ? true : undefined}
                  onChange={(e) => onChange("price", formatRent(e.target.value))}
                  className="min-w-0 flex-1 bg-transparent text-base text-foreground outline-none placeholder:text-muted/80"
                />
                {priceError ? (
                  <CircleAlert size={18} className="shrink-0 text-red-600" aria-hidden />
                ) : null}
              </div>
            </div>
            <p className={cn("mt-2 text-[13px]", words ? "text-foreground" : "text-muted")}>
              {words ? `₹ ${words}` : "₹ Price in words"}
            </p>
          </div>
          <RateReadout price={form.price} area={basis.value} areaLabel={basis.label} />
        </div>
        <PriceOptionFields form={form} onChange={onChange} />
      </div>

      <Choices
        label="Is it Pre-leased / Pre-Rented?"
        hint="For properties that are already rented out"
        value={form.preLeased}
        options={YES_NO_OPTIONS}
        onChange={(value) => {
          onChange("preLeased", value);
          if (value !== "yes") {
            onChange("currentRent", "");
            onChange("leaseTenure", "");
            onChange("annualRentIncrement", "");
            onChange("leasedTo", "");
            setLeaseExtras(false);
          }
        }}
        columns={2}
      />

      {form.preLeased === "yes" && (
        <div>
          <SectionMessage
            title="Pre-leased / Pre-Rented Details"
            hint="Lease / Rent related details of your property"
          />
          <div className="mt-3 space-y-3">
            <div data-field-error={rentError ? "true" : undefined}>
              <div
                className={cn(
                  "flex items-center gap-1.5 rounded-xl border bg-background px-3 py-2.5",
                  rentError
                    ? "border-red-500"
                    : "border-border focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/25",
                )}
              >
                <span className="text-base text-muted">₹</span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={rentDigits(form.currentRent)}
                  placeholder="Current rent per month"
                  aria-label="Current rent per month"
                  aria-invalid={rentError ? true : undefined}
                  onChange={(e) => onChange("currentRent", formatRent(e.target.value))}
                  className="min-w-0 flex-1 bg-transparent text-base text-foreground outline-none placeholder:text-muted/80"
                />
                {rentError ? (
                  <CircleAlert size={18} className="shrink-0 text-red-600" aria-hidden />
                ) : null}
              </div>
              {rentError ? <FieldMessage>{rentError}</FieldMessage> : null}
            </div>
            <input
              type="text"
              inputMode="numeric"
              value={form.leaseTenure}
              placeholder="Lease tenure in years"
              aria-label="Lease tenure in years"
              onChange={(e) => onChange("leaseTenure", e.target.value.replace(/[^\d]/g, ""))}
              className={fieldClass}
            />
            <button
              type="button"
              onClick={() => setLeaseExtras((open) => !open)}
              className="text-sm font-medium text-primary"
            >
              {leaseExtras
                ? "Hide annual rent increment & leased to"
                : "+ Add Annual Rent Increment & Leased to"}
            </button>
            {leaseExtras && (
              <div className="space-y-3">
                <input
                  type="text"
                  inputMode="decimal"
                  value={form.annualRentIncrement}
                  placeholder="Annual rent increment"
                  aria-label="Annual rent increment"
                  onChange={(e) => onChange("annualRentIncrement", e.target.value)}
                  className={fieldClass}
                />
                <input
                  type="text"
                  value={form.leasedTo}
                  placeholder="Leased to"
                  aria-label="Leased to"
                  onChange={(e) => onChange("leasedTo", e.target.value)}
                  className={fieldClass}
                />
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
