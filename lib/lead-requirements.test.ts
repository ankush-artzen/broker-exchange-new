import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildLeadCreateData, matchesLeadQuery, emptyLeadListQuery } from "./lead-filters";
import {
  leadMatchesProperty,
  requirementFieldErrors,
  requirementShape,
} from "./lead-requirements";

describe("conditional lead requirements", () => {
  const budget = { budgetMin: 5_000_000, budgetMax: 8_000_000, locations: ["Mohali"] };

  it("requires BHK only for flat, builder floor, house, and penthouse", () => {
    assert.equal(requirementShape(["flat", "plot"]).needsBhk, true);
    assert.equal(requirementShape(["flat", "plot"]).needsPlotSize, true);
    assert.equal(requirementShape(["studio"]).needsBhk, false);
    assert.equal(requirementShape(["office", "sco", "storage"]).needsArea, true);
    assert.equal(requirementShape(["farmhouse"]).needsPlotSize, true);
    assert.ok(requirementFieldErrors({ ...budget, propertyTypes: ["flat"] }, true).bhks);
    assert.equal(
      requirementFieldErrors(
        { ...budget, propertyTypes: ["studio"] },
        true,
      ).bhks,
      undefined,
    );
    assert.equal(
      requirementFieldErrors(
        { ...budget, propertyTypes: ["office"], category: "commercial" },
        true,
      ).bhks,
      undefined,
    );
    assert.equal(
      requirementFieldErrors(
        { ...budget, propertyTypes: ["flat"], bhks: ["2", "3"] },
        true,
      ).propertyTypes,
      undefined,
    );
  });

  it("requires 1 to 3 locations and both budget bounds", () => {
    const missing = requirementFieldErrors(
      { propertyTypes: ["plot"], locations: [], budgetMin: 1, budgetMax: null },
      true,
    );
    assert.equal(missing.locations, "Add 1 to 3 locations");
    assert.equal(missing.budget, "Enter a minimum and maximum budget");
    assert.equal(
      requirementFieldErrors(
        {
          propertyTypes: ["plot"],
          locations: ["Sector 70", "Phase 7", "Airport Road"],
          budgetMin: 2_000_000,
          budgetMax: 4_000_000,
        },
        true,
      ).locations,
      undefined,
    );
  });

  it("stores a multi-type lead without asking a studio for BHK", () => {
    const created = buildLeadCreateData({
      explicitStructured: true,
      intent: "buy",
      category: "residential",
      propertyTypes: ["flat", "studio", "plot"],
      bhks: ["2", "4+"],
      locations: ["Mohali"],
      budgetMin: 8_000_000,
      budgetMax: 10_000_000,
      plotSizeMin: 200,
      plotSizeMax: 300,
      plotSizeUnit: "gaj",
      constructionStatus: "any",
      furnishing: "semi-furnished",
    });
    assert.deepEqual(created.propertyTypes, ["flat", "studio", "plot"]);
    assert.equal(created.propertyType, "flat");
    assert.deepEqual(created.bhks, ["2", "4+"]);
    assert.equal(created.plotSizeUnit, "sq-yd");
    assert.equal(created.plotSizeMin, 200);
    assert.equal(created.plotSizeMax, 300);
    assert.equal(created.furnishing, "semi");
    assert.equal(created.constructionStatus, "any");
    assert.match(created.requirement ?? "", /Flat \/ Apartment/);
    assert.match(created.requirement ?? "", /Plot \/ Land/);
  });

  it("drops size fields that do not belong to the selected types", () => {
    const created = buildLeadCreateData({
      explicitStructured: true,
      category: "commercial",
      propertyTypes: ["office"],
      bhks: ["3"],
      locations: ["Mohali"],
      budgetMin: 50_000,
      budgetMax: 80_000,
      plotSizeMin: 200,
      plotSizeUnit: "marla",
      areaMin: 1200,
      areaMax: 2000,
    });
    assert.equal(created.bhk, null);
    assert.equal(created.plotSizeMin, null);
    assert.equal(created.areaMin, 1200);
    assert.equal(created.areaMax, 2000);
    assert.equal(created.areaUnit, "sq-ft");
  });

  it("matches a listing on the same property id, including villa and house", () => {
    const lead = {
      intent: "buy",
      category: "residential",
      propertyTypes: ["house"],
      bhks: ["3"],
      locations: ["Mohali"],
      budgetMin: 8_000_000,
      budgetMax: 12_000_000,
      constructionStatus: "ready",
    };
    assert.equal(
      leadMatchesProperty(lead, {
        intent: "sell",
        category: "residential",
        propertyType: "villa",
        bedrooms: "3",
        location: "Sector 70, Mohali",
        possession: "ready",
      }, { min: 9_000_000, max: 9_000_000 }),
      true,
    );
    assert.equal(
      leadMatchesProperty(lead, {
        intent: "rent",
        propertyType: "house",
        bedrooms: "3",
        location: "Mohali",
      }),
      false,
    );
    assert.equal(
      matchesLeadQuery(
        {
          name: "Both",
          propertyTypes: ["flat", "plot"],
          bhks: ["2"],
          location: "Mohali",
        },
        { ...emptyLeadListQuery(), propertyTypes: ["plot"], bhks: ["2"] },
      ),
      true,
    );
  });
});
