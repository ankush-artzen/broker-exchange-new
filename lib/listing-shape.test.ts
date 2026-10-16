import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  boundedSalePriceError,
  hiddenAreaFields,
  pricingBasis,
  showsSocietyField,
} from "./listing-shape";

function amount(value: string) {
  const digits = value.replace(/[^\d]/g, "");
  return digits ? Number(digits) : 0;
}

describe("property listing shape", () => {
  it("accepts a full expected price and rejects the old short ceiling", () => {
    const required = "Expected price is required";
    assert.equal(boundedSalePriceError(amount("₹10,000"), required), "");
    assert.equal(boundedSalePriceError(amount("₹1,70,00,000"), required), "");
    assert.match(boundedSalePriceError(amount("₹250"), required), /10,000/);
    assert.match(boundedSalePriceError(amount("₹6,00,00,00,000"), required), /500 crore/);
  });

  it("uses carpet and super area for flats, and hides society on plots", () => {
    assert.deepEqual(
      hiddenAreaFields({ category: "residential", propertyType: "flat" }),
      ["plotArea", "builtUpArea"],
    );
    assert.equal(
      pricingBasis({
        category: "residential",
        propertyType: "flat",
        superBuiltUpArea: "1350 Square Feet",
        carpetArea: "1100 Square Feet",
      }).label,
      "Super Area",
    );
    assert.equal(showsSocietyField({ category: "residential", propertyType: "plot" }), false);
    assert.equal(showsSocietyField({ category: "residential", propertyType: "flat" }), true);
    assert.equal(
      showsSocietyField({ category: "residential", propertyType: "builder-floor" }),
      false,
    );
  });

  it("prices a house from built-up area and a plot from plot area", () => {
    assert.equal(
      pricingBasis({
        category: "residential",
        propertyType: "house",
        builtUpArea: "2400 Square Feet",
        plotArea: "300 Square Yards",
      }).label,
      "Built-up Area",
    );
    assert.equal(
      pricingBasis({
        category: "residential",
        propertyType: "plot",
        plotArea: "200 Square Yards",
      }).label,
      "Plot Area",
    );
    assert.deepEqual(
      hiddenAreaFields({ category: "residential", propertyType: "house" }),
      ["carpetArea", "superBuiltUpArea"],
    );
  });
});
