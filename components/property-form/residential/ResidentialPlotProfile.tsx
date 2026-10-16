"use client";

import { amountInWords } from "@/lib/price";
import {
  OPEN_SIDE_OPTIONS,
  PLOT_CONSTRUCTION_OPTIONS,
  PLOT_POSSESSION_OPTIONS,
  YES_NO_OPTIONS,
} from "@/lib/constants/property";
import { SqFtField } from "@/components/property-form/area";
import {
  Choices,
  Field,
  MultiChoices,
  SelectField,
} from "@/components/property-form/fields";
import { PriceOptionFields } from "@/components/property-form/price-options";
import { formatRent, rentDigits } from "@/components/property-form/helpers";
import { RateReadout } from "@/components/property-form/price-details";
import { FieldMessage, SectionMessage } from "@/components/property-form/messages";
import type { ListingChange, ListingDraft } from "@/components/property-form/types";

export function ResidentialPlotProfile({
  form,
  onChange,
  onConstruction,
  priceError,
  areaError,
}: {
  form: ListingDraft;
  onChange: ListingChange;
  onConstruction: (value: string) => void;
  priceError?: string;
  areaError?: string;
}) {
  const built = form.constructionDone === "yes";
  const vacant = form.constructionDone === "no";
  const words = amountInWords(form.price);

  const toggleConstruction = (id: string) => {
    const selected = form.constructionTypes.includes(id);
    onChange(
      "constructionTypes",
      selected
        ? form.constructionTypes.filter((item) => item !== id)
        : [...form.constructionTypes, id],
    );
  };

  return (
    <>
      <div data-field-error={areaError ? "true" : undefined}>
        <SectionMessage title="Add Area Details" hint="Plot area is required." />
        <div className="mt-3">
          <SqFtField
            label="Plot Area"
            value={form.plotArea}
            onChange={(value) => onChange("plotArea", value)}
          />
        </div>
        {areaError ? <FieldMessage>{areaError}</FieldMessage> : null}
      </div>

      <div>
        <SectionMessage title="Property Dimensions" />
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Field
            label="Length of plot (in Ft.)"
            value={form.plotLength}
            onChange={(value) => onChange("plotLength", value.replace(/[^\d.]/g, ""))}
            inputMode="decimal"
          />
          <Field
            label="Breadth of plot (in Ft.)"
            value={form.plotBreadth}
            onChange={(value) => onChange("plotBreadth", value.replace(/[^\d.]/g, ""))}
            inputMode="decimal"
          />
        </div>
      </div>

      <div>
        <SectionMessage title="Floors Allowed For Construction" />
        <div className="mt-3">
          <Field
            label="No. of floors"
            value={form.floorsAllowed}
            onChange={(value) => onChange("floorsAllowed", value.replace(/[^\d]/g, ""))}
            inputMode="numeric"
          />
        </div>
      </div>

      <Choices
        label="Is there a boundary wall around the property?"
        value={form.boundaryWall}
        options={YES_NO_OPTIONS}
        onChange={(value) => onChange("boundaryWall", value)}
        columns={2}
      />

      <Choices
        label="No. of open sides"
        value={form.openSides}
        options={OPEN_SIDE_OPTIONS}
        onChange={(value) => onChange("openSides", value)}
        columns={4}
      />

      <Choices
        label="Any construction done on this property?"
        value={form.constructionDone}
        options={YES_NO_OPTIONS}
        onChange={onConstruction}
        columns={2}
      />

      {built && (
        <MultiChoices
          label="What type of construction has been done?"
          values={form.constructionTypes}
          options={PLOT_CONSTRUCTION_OPTIONS}
          onToggle={toggleConstruction}
        />
      )}

      <SelectField
        label="Possession By"
        value={form.possessionBy}
        onChange={(value) => onChange("possessionBy", value)}
        options={PLOT_POSSESSION_OPTIONS}
        placeholder="Expected by"
      />

      <Field
        label={
          built
            ? "Which authority the property is approved by? (Optional)"
            : vacant
              ? "Which authority the property is approved by?"
              : "Which authority has the construction approved by?"
        }
        value={form.approvedBy}
        onChange={(value) => onChange("approvedBy", value)}
        placeholder="Local Authority"
      />

      <div data-field-error={priceError ? "true" : undefined}>
        <SectionMessage title="Price Details" />
        <div className="mt-3 space-y-4">
          <Field
            label="Expected Price"
            value={rentDigits(form.price)}
            onChange={(value) => onChange("price", formatRent(value))}
            placeholder="Expected Price"
            inputMode="numeric"
            error={priceError}
          />
          {words && <p className="-mt-2 text-[12px] text-muted">{words}</p>}
          <RateReadout price={form.price} area={form.plotArea} areaLabel="Plot Area" />
          <PriceOptionFields form={form} onChange={onChange} />
        </div>
      </div>
    </>
  );
}
