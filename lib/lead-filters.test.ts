import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildLeadCreateData,
  compareLeads,
  emptyLeadListQuery,
  formatBudgetLabel,
  isFollowUpOverdue,
  isFollowUpThisWeek,
  isFollowUpToday,
  matchesFollowUpFilter,
  matchesLeadQuery,
  migrationPatch,
  parseBudgetRange,
  parseRequirementText,
  rupeesToPriceInput,
  sortLeads,
  viewLead,
  type LeadFilterable,
  type LeadListQuery,
} from "./lead-filters";

const NOW = new Date(2026, 9, 14, 15, 30, 0, 0);

function at(year: number, month: number, day: number, hour = 0, minute = 0) {
  return new Date(year, month - 1, day, hour, minute).toISOString();
}

function lead(partial: Partial<LeadFilterable> & { name: string }): LeadFilterable {
  return {
    followUpDone: false,
    createdAt: at(2026, 10, 1, 9, 0),
    status: "new",
    ...partial,
  };
}

describe("budget ranges", () => {
  it("parses a compact range into rupees", () => {
    assert.deepEqual(parseBudgetRange("80L - 1Cr"), {
      min: 8_000_000,
      max: 10_000_000,
    });
  });

  it("parses a single PriceField value as a point budget", () => {
    assert.deepEqual(parseBudgetRange("₹50 Lakh"), {
      min: 5_000_000,
      max: 5_000_000,
    });
  });

  it("treats a unitless lower bound as the next smaller unit", () => {
    assert.deepEqual(parseBudgetRange("80 - 1 Cr"), {
      min: 8_000_000,
      max: 10_000_000,
    });
  });

  it("formats numeric ranges for display", () => {
    assert.equal(formatBudgetLabel(8_000_000, 10_000_000), "80L - 1Cr");
    assert.equal(formatBudgetLabel(5_000_000, 5_000_000), "50L");
  });

  it("round-trips rupees through the price input", () => {
    const input = rupeesToPriceInput(15_000_000);
    assert.equal(parseBudgetRange(input).min, 15_000_000);
  });

  it("filters by numeric overlap instead of text order", () => {
    const ranged = lead({
      name: "Range",
      budget: "80L - 1Cr",
    });
    const within = {
      ...emptyLeadListQuery(),
      budgetMin: 9_000_000,
      budgetMax: 9_500_000,
    };
    const above = {
      ...emptyLeadListQuery(),
      budgetMin: 20_000_000,
      budgetMax: 30_000_000,
    };
    assert.equal(matchesLeadQuery(ranged, within, NOW), true);
    assert.equal(matchesLeadQuery(ranged, above, NOW), false);
    assert.equal(
      matchesLeadQuery(lead({ name: "No budget" }), within, NOW),
      false,
    );
  });

  it("sorts budgets high to low and keeps missing budgets last", () => {
    const sorted = sortLeads(
      [
        lead({ name: "Nine", budget: "9L" }),
        lead({ name: "Missing" }),
        lead({ name: "Eighty", budget: "80L" }),
        lead({ name: "Crore", budget: "1Cr" }),
      ],
      "budget-desc",
      NOW,
    );
    assert.deepEqual(
      sorted.map((item) => item.name),
      ["Crore", "Eighty", "Nine", "Missing"],
    );
  });
});

describe("requirement normalization", () => {
  it("reads structured values out of legacy requirement text", () => {
    assert.deepEqual(parseRequirementText("Rent 2BHK flat"), {
      intent: "rent",
      propertyType: "flat",
      bhk: "2",
      constructionStatus: null,
    });
    assert.equal(parseRequirementText("5 BHK").bhk, "4+");
    assert.equal(parseRequirementText("Vacant Plot").propertyType, "plot");
    assert.equal(
      parseRequirementText("50% Constructed").constructionStatus,
      "under-construction",
    );
    assert.equal(
      parseRequirementText("100% Constructed").constructionStatus,
      "ready",
    );
  });

  it("keeps stored dropdown values ahead of free text", () => {
    const viewed = viewLead({
      requirement: "2 BHK",
      bhk: "3",
      intent: "buy",
    });
    assert.equal(viewed.bhk, "3");
    assert.equal(viewed.intent, "buy");
  });

  it("stores numeric budget and structured fields for a legacy create", () => {
    const created = buildLeadCreateData({
      requirement: "Rent 2BHK flat",
      budget: "80L - 1Cr",
      location: "Mohali",
    });
    assert.equal(created.intent, "rent");
    assert.equal(created.propertyType, "flat");
    assert.equal(created.bhk, "2");
    assert.equal(created.budgetMin, 8_000_000);
    assert.equal(created.budgetMax, 10_000_000);
    assert.equal(created.budget, "80L - 1Cr");
    assert.equal(created.requirement, "Rent 2BHK flat");
  });

  it("fills only missing fields when migrating a lead", () => {
    const patch = migrationPatch({
      requirement: "Buy 3 BHK villa",
      budget: "₹90 Lakh",
      budgetMin: null,
      budgetMax: null,
      intent: null,
      propertyType: "office",
      bhk: null,
      constructionStatus: null,
    });
    assert.equal(patch?.budgetMin, 9_000_000);
    assert.equal(patch?.intent, "buy");
    assert.equal(patch?.bhk, "3");
    assert.equal(patch?.propertyType, undefined);
    assert.equal(patch?.constructionStatus, undefined);
  });
});

describe("follow-up filters", () => {
  const yesterday = lead({
    name: "Yesterday",
    followUpDate: at(2026, 10, 13),
  });
  const todayEarly = lead({
    name: "Today early",
    followUpDate: at(2026, 10, 14, 10, 0),
  });
  const todayLater = lead({
    name: "Today later",
    followUpDate: at(2026, 10, 14, 18, 0),
  });
  const friday = lead({
    name: "Friday",
    followUpDate: at(2026, 10, 16, 11, 0),
  });
  const lastMonday = lead({
    name: "Last Monday",
    followUpDate: at(2026, 10, 12, 11, 0),
  });
  const nextMonday = lead({
    name: "Next Monday",
    followUpDate: at(2026, 10, 19, 11, 0),
  });
  const unmarked = lead({ name: "None" });
  const done = lead({
    name: "Done",
    followUpDate: at(2026, 10, 13, 11, 0),
    followUpDone: true,
  });

  it("classifies overdue, today, and the rest of the local week", () => {
    assert.equal(isFollowUpOverdue(yesterday.followUpDate, NOW), true);
    assert.equal(isFollowUpToday(yesterday.followUpDate, NOW), false);
    assert.equal(isFollowUpThisWeek(yesterday.followUpDate, NOW), false);

    assert.equal(isFollowUpOverdue(todayEarly.followUpDate, NOW), true);
    assert.equal(isFollowUpToday(todayEarly.followUpDate, NOW), true);
    assert.equal(isFollowUpThisWeek(todayEarly.followUpDate, NOW), true);

    assert.equal(isFollowUpOverdue(todayLater.followUpDate, NOW), false);
    assert.equal(isFollowUpToday(todayLater.followUpDate, NOW), true);
    assert.equal(matchesFollowUpFilter(friday, "this-week", NOW), true);
    assert.equal(matchesFollowUpFilter(friday, "today", NOW), false);
    assert.equal(matchesFollowUpFilter(lastMonday, "this-week", NOW), false);
    assert.equal(matchesFollowUpFilter(lastMonday, "overdue", NOW), true);
    assert.equal(matchesFollowUpFilter(nextMonday, "this-week", NOW), false);
  });

  it("treats a completed follow-up as no follow-up set", () => {
    assert.equal(matchesFollowUpFilter(done, "none", NOW), true);
    assert.equal(matchesFollowUpFilter(done, "overdue", NOW), false);
    assert.equal(matchesFollowUpFilter(unmarked, "none", NOW), true);
    assert.equal(matchesFollowUpFilter(unmarked, "today", NOW), false);
  });

  it("sorts overdue first, then later follow-ups, then missing dates", () => {
    const sorted = sortLeads(
      [nextMonday, unmarked, todayLater, friday, yesterday, todayEarly, done],
      "follow-up",
      NOW,
    );
    assert.deepEqual(
      sorted.map((item) => item.name),
      [
        "Yesterday",
        "Today early",
        "Today later",
        "Friday",
        "Next Monday",
        "Done",
        "None",
      ],
    );
  });
});

describe("filter combinations", () => {
  const buyToday = lead({
    name: "Buy today",
    intent: "buy",
    status: "interested",
    followUpDate: at(2026, 10, 14, 18, 0),
    propertyType: "flat",
    bhk: "2",
    location: "Sector 70, Mohali",
    budgetMin: 5_000_000,
    budgetMax: 5_000_000,
  });
  const rentOverdue = lead({
    name: "Rent overdue",
    requirement: "Rent shop",
    status: "new",
    followUpDate: at(2026, 10, 13),
  });
  const closed = lead({
    name: "Closed",
    status: "closed",
    intent: "buy",
  });

  function query(partial: Partial<LeadListQuery>): LeadListQuery {
    return { ...emptyLeadListQuery(), ...partial };
  }

  it("ORs chips in a group and ANDs different groups", () => {
    const bothFollowUps = [buyToday, rentOverdue, closed].filter((item) =>
      matchesLeadQuery(
        item,
        query({ followUps: ["today", "overdue"] }),
        NOW,
      ),
    );
    assert.deepEqual(
      bothFollowUps.map((item) => item.name),
      ["Buy today", "Rent overdue"],
    );

    const buyAndToday = [buyToday, rentOverdue].filter((item) =>
      matchesLeadQuery(
        item,
        query({ followUps: ["today"], intents: ["buy"] }),
        NOW,
      ),
    );
    assert.deepEqual(
      buyAndToday.map((item) => item.name),
      ["Buy today"],
    );
  });

  it("matches property type, bhk, location, and status together", () => {
    const selected = query({
      statuses: ["interested"],
      propertyTypes: ["flat"],
      bhks: ["2", "4+"],
      location: "mohali",
    });
    assert.equal(matchesLeadQuery(buyToday, selected, NOW), true);
    assert.equal(matchesLeadQuery(rentOverdue, selected, NOW), false);
    assert.equal(
      matchesLeadQuery(
        lead({ name: "Five", requirement: "5 BHK villa", status: "new" }),
        query({ bhks: ["4+"], propertyTypes: ["villa"] }),
        NOW,
      ),
      true,
    );
  });

  it("returns every lead when no filters are selected", () => {
    assert.equal(matchesLeadQuery(closed, emptyLeadListQuery(), NOW), true);
    assert.equal(
      compareLeads(
        lead({ name: "Newer", createdAt: at(2026, 10, 10, 12) }),
        lead({ name: "Older", createdAt: at(2026, 10, 2, 12) }),
        "newest",
        NOW,
      ) < 0,
      true,
    );
  });
});
