import { NextRequest } from "next/server";
import { isAdmin, isSuperAdmin, leadScope } from "@/lib/access";
import { getAuthUser, unauthorized } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import {
  buildLeadCreateData,
  matchesLeadQuery,
  normalizeTemperature,
  sortLeads,
  sortLeadsGroupedByOwner,
} from "@/lib/lead-filters";
import { parseLeadListRequest } from "@/lib/lead-list-params";
import {
  requirementErrorMessage,
  requirementFieldErrors,
} from "@/lib/lead-requirements";
import { ownerNames, serializeLead } from "@/lib/records";
import { parseFollowUpMoment } from "@/lib/utils";

function collectLeadLocations(
  rows: { location?: string | null; locations?: string[] | null }[],
): string[] {
  const values = new Set<string>();
  for (const lead of rows) {
    const areas = lead.locations?.length
      ? lead.locations
      : lead.location
        ? [lead.location]
        : [];
    for (const area of areas) {
      const location = area.trim();
      if (location) values.add(location);
    }
  }
  return [...values].sort((a, b) => a.localeCompare(b));
}

export async function GET(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) return unauthorized();

  try {
    const parsed = parseLeadListRequest(request.nextUrl.searchParams);
    const ownerId = isAdmin(user) ? parsed.ownerId : "";
    const needle = parsed.name.toLowerCase();
    const superAdmin = isSuperAdmin(user);
    const leads = await prisma.lead.findMany({
      where: leadScope(user),
    });
    const names = isAdmin(user)
      ? await ownerNames(leads.map((lead) => lead.userId))
      : null;

    const serialized = leads.map((lead) => ({
      ...serializeLead(lead, false),
      ...(names ? { ownerName: names.get(lead.userId) ?? null } : {}),
    }));
    const searched = serialized.filter((lead) => {
      const ownerOk = !ownerId || lead.userId === ownerId;
      const nameOk =
        Boolean(ownerId) ||
        !needle ||
        lead.name.toLowerCase().includes(needle) ||
        (lead.ownerName || "").toLowerCase().includes(needle);
      return ownerOk && nameOk;
    });
    const matched = searched.filter((lead) =>
      matchesLeadQuery(lead, parsed.query),
    );
    const sorted = superAdmin
      ? sortLeadsGroupedByOwner(matched, parsed.sort)
      : sortLeads(matched, parsed.sort);
    const ownerNamesById = new Map<string, string>();
    if (superAdmin) {
      for (const lead of serialized) {
        if (!ownerNamesById.has(lead.userId)) {
          ownerNamesById.set(
            lead.userId,
            lead.ownerName?.trim() || "Unknown user",
          );
        }
      }
    }

    return Response.json({
      leads: sorted,
      total: serialized.length,
      locations: collectLeadLocations(serialized),
      owners: [...ownerNamesById.entries()]
        .map(([id, name]) => ({ id, name }))
        .sort((a, b) => a.name.localeCompare(b.name)),
      intentCounts: {
        buy: searched.filter((lead) =>
          matchesLeadQuery(lead, { ...parsed.query, intents: ["buy"] }),
        ).length,
        rent: searched.filter((lead) =>
          matchesLeadQuery(lead, { ...parsed.query, intents: ["rent"] }),
        ).length,
      },
    });
  } catch (error) {
    console.error("get leads error:", error);
    return Response.json({ error: "Failed to fetch leads" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) return unauthorized();
  if (isAdmin(user)) {
    return Response.json(
      { error: "Only brokers can add leads" },
      { status: 403 },
    );
  }

  try {
    const body = await request.json();
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const phone = typeof body.phone === "string" ? body.phone.trim() : "";

    if (!name || !phone) {
      return Response.json(
        { error: "Name and phone are required" },
        { status: 400 },
      );
    }

    const fields = buildLeadCreateData(body);
    if (body.explicitStructured === true) {
      const message = requirementErrorMessage(
        requirementFieldErrors(fields, true),
      );
      if (message) {
        return Response.json({ error: message }, { status: 400 });
      }
    }
    const lead = await prisma.lead.create({
      data: {
        userId: user.id,
        name,
        phone,
        ...fields,
        source: typeof body.source === "string" ? body.source.trim() || null : null,
        notes: typeof body.notes === "string" ? body.notes.trim() || null : null,
        remarks:
          typeof body.remarks === "string" ? body.remarks.trim() || null : null,
        temperature: normalizeTemperature(
          typeof body.temperature === "string" ? body.temperature : null,
        ),
        followUpDate: body.followUpDate
          ? parseFollowUpMoment(body.followUpDate)
          : null,
      },
    });

    return Response.json(serializeLead(lead, false));
  } catch (error) {
    console.error("create lead error:", error);
    return Response.json({ error: "Failed to create lead" }, { status: 500 });
  }
}
