import { NextRequest } from "next/server";
import { isAdmin, leadScope } from "@/lib/access";
import { getAuthUser, unauthorized } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { buildLeadCreateData, normalizeTemperature } from "@/lib/lead-filters";
import {
  requirementErrorMessage,
  requirementFieldErrors,
} from "@/lib/lead-requirements";
import { ownerNames, serializeLead } from "@/lib/records";
import { parseFollowUpMoment } from "@/lib/utils";

export async function GET(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) return unauthorized();

  try {
    const leads = await prisma.lead.findMany({
      where: leadScope(user),
      orderBy: { updatedAt: "desc" },
    });
    const names = isAdmin(user)
      ? await ownerNames(leads.map((lead) => lead.userId))
      : null;

    return Response.json(
      leads.map((lead) => ({
        ...serializeLead(lead, false),
        ...(names ? { ownerName: names.get(lead.userId) ?? null } : {}),
      })),
    );
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
