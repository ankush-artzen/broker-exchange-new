import { NextRequest } from "next/server";
import { isAdmin, leadOwned } from "@/lib/access";
import { getAuthUser, unauthorized } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { buildLeadPatchData } from "@/lib/lead-filters";
import {
  requirementErrorMessage,
  requirementFieldErrors,
} from "@/lib/lead-requirements";
import { ownerNames, serializeLead } from "@/lib/records";
import { parseFollowUpMoment } from "@/lib/utils";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: RouteParams) {
  const user = await getAuthUser(request);
  if (!user) return unauthorized();

  const { id } = await params;

  try {
    const lead = await prisma.lead.findFirst({
      where: leadOwned(user, id),
    });
    if (!lead) {
      return Response.json({ error: "Lead not found" }, { status: 404 });
    }

    const names = isAdmin(user) ? await ownerNames([lead.userId]) : null;
    return Response.json({
      ...serializeLead(lead, false),
      ...(names ? { ownerName: names.get(lead.userId) ?? null } : {}),
    });
  } catch (error) {
    console.error("get lead error:", error);
    return Response.json({ error: "Failed to fetch lead" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const user = await getAuthUser(request);
  if (!user) return unauthorized();

  const { id } = await params;

  try {
    const existing = await prisma.lead.findFirst({
      where: leadOwned(user, id),
    });
    if (!existing) {
      return Response.json({ error: "Lead not found" }, { status: 404 });
    }

    const body = await request.json();
    if (body.explicitStructured === true) {
      const preview = buildLeadPatchData(existing, body);
      const message = requirementErrorMessage(
        requirementFieldErrors(
          {
            category: (preview.category as string | null | undefined) ?? existing.category,
            propertyTypes:
              (preview.propertyTypes as string[] | undefined) ?? existing.propertyTypes,
            propertyType:
              (preview.propertyType as string | null | undefined) ?? existing.propertyType,
            bhks: (preview.bhks as string[] | undefined) ?? existing.bhks,
            bhk: (preview.bhk as string | null | undefined) ?? existing.bhk,
            locations: (preview.locations as string[] | undefined) ?? existing.locations,
            location: (preview.location as string | null | undefined) ?? existing.location,
            budgetMin:
              (preview.budgetMin as number | null | undefined) ?? existing.budgetMin,
            budgetMax:
              (preview.budgetMax as number | null | undefined) ?? existing.budgetMax,
          },
          true,
        ),
      );
      if (message) {
        return Response.json({ error: message }, { status: 400 });
      }
    }
    const data = buildLeadPatchData(existing, body);
    if (body.followUpDate !== undefined) {
      data.followUpDate = body.followUpDate
        ? parseFollowUpMoment(body.followUpDate)
        : null;
    }

    const lead = await prisma.lead.update({ where: { id }, data });

    return Response.json(serializeLead(lead, false));
  } catch (error) {
    console.error("update lead error:", error);
    return Response.json({ error: "Failed to update lead" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const user = await getAuthUser(request);
  if (!user) return unauthorized();

  const { id } = await params;

  try {
    const existing = await prisma.lead.findFirst({
      where: leadOwned(user, id),
    });
    if (!existing) {
      return Response.json({ error: "Lead not found" }, { status: 404 });
    }

    await prisma.lead.delete({ where: { id } });
    return Response.json({ success: true });
  } catch (error) {
    console.error("delete lead error:", error);
    return Response.json({ error: "Failed to delete lead" }, { status: 500 });
  }
}
