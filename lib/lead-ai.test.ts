import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { normalizePlotSize } from "./area";
import { remarkSourceLines, sanitizeExtractedLead } from "./lead-ai";

describe("lead notes extraction", () => {
  it("keeps stated fields and leaves the rest empty", () => {
    const extracted = sanitizeExtractedLead({
      name: "Rahul Sharma",
      phone: "9876543210",
      location: "Mohali",
      budget: "80L - 1Cr",
      intent: "buy",
      propertyType: "flat",
      bhk: "2",
      plotSize: "200 square yards",
      notes: "Call after 6",
      followUpDate: "2026-10-20",
    });

    assert.equal(extracted.name, "Rahul Sharma");
    assert.equal(extracted.intent, "buy");
    assert.equal(extracted.propertyType, "flat");
    assert.equal(extracted.bhk, "2");
    assert.equal(extracted.budget, "80L - 1Cr");
    assert.equal(extracted.plotSize, "200 Sq. Yard");
    assert.equal(extracted.plotSizeMin, 200);
    assert.equal(extracted.plotSizeMax, 200);
    assert.equal(extracted.plotSizeUnit, "sq-yd");
    assert.equal(extracted.followUpDate, "2026-10-20");
    assert.equal(extracted.notes, "Call after 6");
  });

  it("does not guess a name, budget, unit, or buy/rent choice", () => {
    const extracted = sanitizeExtractedLead({
      name: "Buyer",
      budget: "flexible",
      intent: "buy or rent",
      propertyType: "maybe a house",
      bhk: "2 or 3",
      plotSize: "200",
      followUpDate: "next week",
    });

    assert.equal(extracted.name, null);
    assert.equal(extracted.budget, null);
    assert.equal(extracted.intent, null);
    assert.equal(extracted.propertyType, null);
    assert.deepEqual(extracted.bhks, ["2", "3"]);
    assert.equal(extracted.plotSize, null);
    assert.equal(extracted.plotSizeMin, null);
    assert.equal(extracted.followUpDate, null);
  });

  it("maps stated Hinglish-style ids and drops a BHK that does not apply", () => {
    const extracted = sanitizeExtractedLead({
      intent: "buy",
      category: "residential",
      propertyTypes: ["studio"],
      bhks: ["2"],
      locations: ["Mohali", "Panchkula", "Zirakpur", "Kharar"],
      plotSizeUnit: "gaj",
      plotSizeMin: 200,
      plotSizeMax: 300,
      constructionStatus: "any",
    });
    assert.equal(extracted.propertyType, "studio");
    assert.equal(extracted.bhk, null);
    assert.deepEqual(extracted.locations, ["Mohali", "Panchkula", "Zirakpur"]);
    assert.equal(extracted.plotSizeUnit, "sq-yd");
    assert.equal(extracted.constructionStatus, "any");
  });

  it("reads a plot size only when the unit is written", () => {
    assert.equal(normalizePlotSize("200"), null);
    assert.equal(normalizePlotSize("200 sq yd"), "200 Square Yards");
  });

  it("includes notes when writing remarks and keeps them as their own fact", () => {
    const lines = remarkSourceLines({
      name: "Rahul Sharma",
      notes: "Prefers a park-facing flat",
      location: "Mohali",
    });
    assert.ok(lines.some((line) => line.startsWith("Notes:")));
    assert.ok(lines.some((line) => line.startsWith("Name:")));
    assert.equal(
      lines.find((line) => line.startsWith("Notes:")),
      "Notes: Prefers a park-facing flat",
    );
  });
});
