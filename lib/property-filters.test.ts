import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  emptyPropertyListQuery,
  matchesPropertyQuery,
  sortProperties,
  type PropertyFilterable,
} from "./property-filters";
import { parsePropertyListRequest } from "./property-list-params";
import { propertyListSearchParams } from "./property-list-search";

function property(overrides: PropertyFilterable = {}): PropertyFilterable {
  return {
    title: "3 BHK flat",
    location: "Sector 45, Mohali",
    price: "₹1.2 Crore",
    propertyType: "flat",
    bedrooms: "3",
    possession: "ready",
    availability: "available",
    city: "Mohali",
    updatedAt: "2026-01-02T00:00:00.000Z",
    ...overrides,
  };
}

describe("property list request", () => {
  it("keeps only known filters and orders the budget", () => {
    const params = new URLSearchParams();
    params.append("propertyType", "flat");
    params.append("propertyType", "not-a-type");
    params.append("bhk", "2");
    params.append("availability", "sold");
    params.append("availability", "maybe");
    params.set("location", " Mohali ");
    params.set("budgetMin", "9000000");
    params.set("budgetMax", "5000000");
    params.set("construction", "ready");
    params.set("sort", "price-desc");
    params.set("q", "  Skyline  ");
    params.set("ownerId", "507f1f77bcf86cd799439011");

    const parsed = parsePropertyListRequest(params);
    assert.deepEqual(parsed.query.propertyTypes, ["flat"]);
    assert.deepEqual(parsed.query.bhks, ["2"]);
    assert.deepEqual(parsed.query.availability, ["sold"]);
    assert.equal(parsed.query.location, "Mohali");
    assert.equal(parsed.query.budgetMin, 5_000_000);
    assert.equal(parsed.query.budgetMax, 9_000_000);
    assert.deepEqual(parsed.query.constructionStatuses, ["ready"]);
    assert.equal(parsed.sort, "price-desc");
    assert.equal(parsed.name, "Skyline");
    assert.equal(parsed.ownerId, "507f1f77bcf86cd799439011");
  });

  it("round-trips the filters the properties page sends", () => {
    const query = {
      ...emptyPropertyListQuery(),
      propertyTypes: ["flat"],
      bhks: ["3"],
      location: "Sector 45",
      budgetMin: 2_000_000,
      budgetMax: 8_000_000,
      constructionStatuses: ["under-construction"],
      availability: ["available" as const],
    };
    const parsed = parsePropertyListRequest(
      propertyListSearchParams({
        query,
        sort: "price-desc",
        name: "Skyline",
      }),
    );
    assert.deepEqual(parsed.query, query);
    assert.equal(parsed.sort, "price-desc");
    assert.equal(parsed.name, "Skyline");
  });
});

describe("property matching", () => {
  it("matches type, bhk, location, price, possession, and availability together", () => {
    const query = {
      ...emptyPropertyListQuery(),
      propertyTypes: ["flat"],
      bhks: ["3"],
      location: "mohali",
      budgetMin: 10_000_000,
      budgetMax: 15_000_000,
      constructionStatuses: ["ready"],
      availability: ["available" as const],
    };
    assert.equal(matchesPropertyQuery(property(), query), true);
    assert.equal(
      matchesPropertyQuery(property({ bedrooms: "2" }), query),
      false,
    );
    assert.equal(
      matchesPropertyQuery(property({ availability: "sold" }), query),
      false,
    );
    assert.equal(
      matchesPropertyQuery(property({ price: "₹80 Lakh" }), query),
      false,
    );
  });

  it("treats immediate possession as ready and 4+ bedrooms as 4+", () => {
    const query = {
      ...emptyPropertyListQuery(),
      bhks: ["4+"],
      constructionStatuses: ["ready"],
    };
    assert.equal(
      matchesPropertyQuery(
        property({ bedrooms: "5+", possession: "immediate", configuration: "" }),
        query,
      ),
      true,
    );
  });

  it("sorts the highest price first", () => {
    const sorted = sortProperties(
      [
        property({ title: "Low", price: "₹50 Lakh" }),
        property({ title: "High", price: "17000000" }),
        property({ title: "Missing", price: "" }),
      ],
      "price-desc",
    );
    assert.deepEqual(
      sorted.map((item) => item.title),
      ["High", "Low", "Missing"],
    );
  });
});
