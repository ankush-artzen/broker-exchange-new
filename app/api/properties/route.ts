import { NextRequest } from "next/server";
import type { Prisma } from "@prisma/client";
import { isAdmin, isSuperAdmin, propertyScope } from "@/lib/access";
import { getAuthUser, unauthorized } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { listingInputError } from "@/lib/property-input";
import {
  collectPropertyLocations,
  matchesPropertyQuery,
  sortProperties,
  sortPropertiesGroupedByOwner,
} from "@/lib/property-filters";
import { parsePropertyListRequest } from "@/lib/property-list-params";
import {
  listingFromBody,
  optionalText,
  photoUrlsFrom,
} from "@/lib/property-listing";
import { ownerNames, serializeProperty } from "@/lib/records";

export async function GET(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) return unauthorized();

  try {
    const parsed = parsePropertyListRequest(request.nextUrl.searchParams);
    const ownerId = isAdmin(user) ? parsed.ownerId : "";
    const needle = parsed.name.toLowerCase();
    const superAdmin = isSuperAdmin(user);
    const properties = await prisma.property.findMany({
      where: propertyScope(user),
    });
    const names = isAdmin(user)
      ? await ownerNames(properties.map((property) => property.userId))
      : null;

    const serialized = properties.map((property) => ({
      ...serializeProperty(property, false),
      ...(names ? { ownerName: names.get(property.userId) ?? null } : {}),
    }));
    const matched = serialized.filter((property) => {
      const ownerOk = !ownerId || property.userId === ownerId;
      const nameOk =
        Boolean(ownerId) ||
        !needle ||
        property.title.toLowerCase().includes(needle) ||
        (property.ownerName || "").toLowerCase().includes(needle);
      return ownerOk && nameOk && matchesPropertyQuery(property, parsed.query);
    });
    const sorted = superAdmin
      ? sortPropertiesGroupedByOwner(matched, parsed.sort)
      : sortProperties(matched, parsed.sort);
    const ownerNamesById = new Map<string, string>();
    if (superAdmin) {
      for (const property of serialized) {
        if (!ownerNamesById.has(property.userId)) {
          ownerNamesById.set(
            property.userId,
            property.ownerName?.trim() || "Unknown user",
          );
        }
      }
    }

    return Response.json({
      properties: sorted,
      total: serialized.length,
      locations: collectPropertyLocations(serialized),
      owners: [...ownerNamesById.entries()]
        .map(([id, name]) => ({ id, name }))
        .sort((a, b) => a.name.localeCompare(b.name)),
    });
  } catch (error) {
    console.error("get properties error:", error);
    return Response.json(
      { error: "Failed to fetch properties" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) return unauthorized();
  if (isAdmin(user)) {
    return Response.json(
      { error: "Only brokers can add properties" },
      { status: 403 },
    );
  }

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const title = optionalText(body.title);
    const location = optionalText(body.location);
    const price = optionalText(body.price);

    if (!title || !location || !price) {
      return Response.json(
        { error: "Title, location, and price are required" },
        { status: 400 },
      );
    }
    const invalid = listingInputError(body);
    if (invalid) {
      return Response.json({ error: invalid }, { status: 400 });
    }

    const property = await prisma.property.create({
      data: {
        userId: user.id,
        title,
        location,
        price,
        configuration: optionalText(body.configuration),
        area: optionalText(body.area),
        availability: optionalText(body.availability),
        notes: optionalText(body.notes),
        photoUrls: photoUrlsFrom(body.photoUrls),
        listing: listingFromBody(body) as Prisma.InputJsonObject,
      },
    });

    return Response.json(serializeProperty(property, false));
  } catch (error) {
    console.error("create property error:", error);
    return Response.json(
      { error: "Failed to create property" },
      { status: 500 },
    );
  }
}
