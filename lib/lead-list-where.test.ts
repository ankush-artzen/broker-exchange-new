import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { emptyLeadListQuery } from "./lead-filters";
import { parseLeadListRequest } from "./lead-list-params";
import { leadListSearchParams } from "./lead-list-search";

describe("lead list request", () => {
  it("keeps only known filters and orders the budget", () => {
    const params = new URLSearchParams();
    params.append("intent", "buy");
    params.append("intent", "nope");
    params.append("propertyType", "flat");
    params.append("bhk", "2");
    params.set("location", " Mohali ");
    params.set("budgetMin", "9000000");
    params.set("budgetMax", "5000000");
    params.set("construction", "ready");
    params.set("sort", "newest");
    params.set("q", "  Amit  ");
    params.set("ownerId", "507f1f77bcf86cd799439011");

    const parsed = parseLeadListRequest(params);
    assert.deepEqual(parsed.query.intents, ["buy"]);
    assert.deepEqual(parsed.query.propertyTypes, ["flat"]);
    assert.deepEqual(parsed.query.bhks, ["2"]);
    assert.equal(parsed.query.location, "Mohali");
    assert.equal(parsed.query.budgetMin, 5_000_000);
    assert.equal(parsed.query.budgetMax, 9_000_000);
    assert.deepEqual(parsed.query.constructionStatuses, ["ready"]);
    assert.equal(parsed.sort, "newest");
    assert.equal(parsed.name, "Amit");
    assert.equal(parsed.ownerId, "507f1f77bcf86cd799439011");
  });

  it("round-trips the filters the leads page sends", () => {
    const query = {
      ...emptyLeadListQuery(),
      intents: ["rent" as const],
      propertyTypes: ["flat"],
      bhks: ["3" as const],
      location: "Sector 45",
      budgetMin: 2_000_000,
      budgetMax: 8_000_000,
      constructionStatuses: ["under-construction"],
    };
    const search = leadListSearchParams({
      query,
      sort: "budget-desc",
      name: "Neha",
    });
    const parsed = parseLeadListRequest(search);
    assert.deepEqual(parsed.query, query);
    assert.equal(parsed.sort, "budget-desc");
    assert.equal(parsed.name, "Neha");
  });
});
