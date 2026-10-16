"use client";

import { useState } from "react";
import { amountInWords } from "@/lib/price";
import {
  APARTMENT_BHK_OPTIONS,
  RENT_AGE_OPTIONS,
  RENT_BALCONY_OPTIONS,
  RENT_FURNISHING_OPTIONS,
  RENT_TENANT_OPTIONS,
  YES_NO_OPTIONS,
} from "@/lib/constants/property";
import { cn } from "@/lib/utils";
import { ProfileAreaFields } from "@/components/property-form/area";
import { areaKind, areaRequirementHint } from "@/lib/listing-shape";
import {
  Choices,
  Field,
  MultiChoices,
  PropertyFloorSelect,
  RoomCount,
  fieldClass,
} from "@/components/property-form/fields";
import { PriceOptionFields } from "@/components/property-form/price-options";
import { formatRent, rentDigits } from "@/components/property-form/helpers";
import { FieldMessage, SectionMessage } from "@/components/property-form/messages";
import type { ListingChange, ListingDraft } from "@/components/property-form/types";

export function RentProfile({
  form,
  onBedrooms,
  onChange,
  areaError,
  priceError,
}: {
  form: ListingDraft;
  onBedrooms: (value: string) => void;
  onChange: ListingChange;
  areaError?: string;
  priceError?: string;
}) {
  const [moreRent, setMoreRent] = useState(Boolean(form.deposit.trim() || form.maintenance.trim()));
  const words = amountInWords(form.price);
  const kind = areaKind(form);
  const apartmentRent = form.propertyType === "flat";
  const presetApartment = APARTMENT_BHK_OPTIONS.some(
    (option) => option.id !== "other" && option.id === form.configuration,
  );
  const otherBhk = /^\d+ BHK$/.test(form.configuration) && !presetApartment;
  const [otherApartment, setOtherApartment] = useState(otherBhk);
  const apartmentValue = presetApartment ? form.configuration : otherApartment || otherBhk ? "other" : "";

  const chooseApartment = (value: string) => {
    if (value === "other") {
      setOtherApartment(true);
      if (presetApartment) onChange("configuration", "");
      return;
    }
    setOtherApartment(false);
    onChange("configuration", value);
    onBedrooms(value.replace(" BHK", ""));
  };

  const toggleTenant = (id: string) => {
    const selected = form.preferredTenants.includes(id);
    if (id === "anyone") {
      onChange("preferredTenants", selected ? [] : ["anyone"]);
      return;
    }
    const next = selected
      ? form.preferredTenants.filter((item) => item !== id)
      : [...form.preferredTenants.filter((item) => item !== "anyone"), id];
    onChange("preferredTenants", next);
  };

  return (
    <>
      {apartmentRent && (
        <div>
          <Choices
            label="Your apartment is a"
            value={apartmentValue}
            options={APARTMENT_BHK_OPTIONS}
            onChange={chooseApartment}
          />
          {(otherApartment || otherBhk) && (
            <input
              type="text"
              inputMode="numeric"
              value={otherBhk ? form.configuration.replace(" BHK", "") : ""}
              placeholder="BHK"
              aria-label="Other BHK"
              onChange={(e) => {
                const count = e.target.value.replace(/[^\d]/g, "");
                if (count === "3" || count === "4" || count === "5" || count === "6") {
                  setOtherApartment(false);
                }
                onChange("configuration", count ? `${count} BHK` : "");
                if (count) onBedrooms(count);
              }}
              className={cn(fieldClass, "mt-2")}
            />
          )}
        </div>
      )}
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
        {areaError && <FieldMessage>{areaError}</FieldMessage>}
      </div>

      <div>
        <SectionMessage title="Add Room Details" />
        <div className="mt-3 space-y-4">
          {form.propertyType !== "studio" && (
            <RoomCount
              label="No. of Bedrooms"
              value={form.bedrooms}
              maxChip={4}
              onChange={onBedrooms}
            />
          )}
          <RoomCount
            label="No. of Bathrooms"
            value={form.bathrooms}
            maxChip={4}
            onChange={(value) => onChange("bathrooms", value)}
          />
          <Choices
            label="Balconies"
            value={form.balconies}
            options={RENT_BALCONY_OPTIONS}
            onChange={(value) => onChange("balconies", value)}
          />
        </div>
      </div>

      <Choices
        label="Furnishing"
        value={form.furnishing}
        options={RENT_FURNISHING_OPTIONS}
        onChange={(value) => onChange("furnishing", value)}
      />

      <div>
        <SectionMessage
          title="Floor Details"
          hint={
            kind === "built"
              ? "Total floors in the building."
              : "Total no of floors and your floor details."
          }
        />
        <div className={kind === "built" ? "mt-3" : "mt-3 grid grid-cols-2 gap-2"}>
          <Field
            label="Total floors"
            value={form.totalFloors}
            onChange={(value) => onChange("totalFloors", value.replace(/[^\d]/g, ""))}
            inputMode="numeric"
          />
          {kind !== "built" && (
            <PropertyFloorSelect
              label="Your floor"
              value={form.propertyFloor}
              totalFloors={form.totalFloors}
              onChange={(value) => onChange("propertyFloor", value)}
            />
          )}
        </div>
      </div>

      <Choices
        label="Age of property"
        value={form.propertyAge}
        options={RENT_AGE_OPTIONS}
        onChange={(value) => onChange("propertyAge", value)}
      />

      <Field
        label="Available from"
        value={form.availableFrom}
        onChange={(value) => onChange("availableFrom", value)}
        type="date"
      />

      <MultiChoices
        label="Willing to rent out to"
        values={form.preferredTenants}
        options={RENT_TENANT_OPTIONS}
        onToggle={toggleTenant}
      />

      <div data-field-error={priceError ? "true" : undefined}>
        <SectionMessage title="Rent Details" />
        <div className="mt-3">
          <Field
            label="Price (Monthly per flat) *"
            value={rentDigits(form.price)}
            onChange={(value) => onChange("price", formatRent(value))}
            placeholder="Expected Rent"
            inputMode="numeric"
            error={priceError}
          />
          {words && <p className="mt-1.5 text-[12px] text-muted">{words}</p>}
        </div>
        <PriceOptionFields form={form} onChange={onChange} />
        <button
          type="button"
          onClick={() => setMoreRent((open) => !open)}
          className="mt-3 text-sm font-medium text-primary"
        >
          {moreRent ? "Hide rent details" : "+ Add more Rent details"}
        </button>
        {moreRent && (
          <div className="mt-3 space-y-4">
            <Field
              label="Security deposit"
              value={form.deposit}
              onChange={(value) => onChange("deposit", value)}
              placeholder="e.g. 2 months"
            />
            <Field
              label="Maintenance"
              value={form.maintenance}
              onChange={(value) => onChange("maintenance", value)}
              placeholder="Monthly charges"
            />
          </div>
        )}
      </div>

      <Choices
        label="Are you ok with brokers contacting you?"
        value={form.brokerContact}
        options={YES_NO_OPTIONS}
        onChange={(value) => onChange("brokerContact", value)}
        columns={2}
      />
    </>
  );
}
