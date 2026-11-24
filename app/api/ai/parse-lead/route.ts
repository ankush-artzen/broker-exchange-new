import { NextRequest } from "next/server";
import { getAuthUser, unauthorized } from "@/lib/api-auth";
import {
  completeAiText,
  isAiAuthError,
  resolveAiProvider,
} from "@/lib/ai-client";
import { sanitizeExtractedLead } from "@/lib/lead-ai";

function extractionPrompt(text: string, langLabel: string) {
  return `You extract real-estate lead requirements from a broker's spoken notes.
The text is in ${langLabel}. It may be English, Hindi, Hinglish, or Punjabi.

"""
${text.trim()}
"""

Return ONLY JSON. Use null for every field that is not explicitly stated.
Never guess, invent, or fill a typical value. If the note does not mention a detail, that field must be null.
An empty array means nothing was stated for that list.

Translate Hindi, Hinglish, and Punjabi into English labels, then map them to the ids below. Do not copy Devanagari or Gurmukhi.

intent: "buy" or "rent".
Hindi/Hinglish: kharidna, kharid, lena, buy = buy. Kiraya, rent, lease = rent. If both are mentioned, use null.

category: "residential" or "commercial". Set it only when the property type makes it obvious or the speaker says residential/commercial.

propertyTypes, any that were named:
Residential: flat, builder-floor, house, plot, studio, serviced-apartment, penthouse, farmhouse, other.
Commercial: office, retail, sco, plot-land, storage, industry, hospitality, other.
Mappings: flat/apartment = flat. Builder floor = builder-floor. Kothi, villa, independent house = house. Plot or land for a home = plot. 1 RK or studio = studio, and do not invent a BHK. Serviced apartment = serviced-apartment. Penthouse = penthouse. Farmhouse = farmhouse.
Office = office. Shop or showroom = retail. SCO, SCF, or booth = sco. Commercial plot or commercial land = plot-land. Warehouse or godown = storage. Factory, shed, or industrial = industry. Hotel or guest house = hospitality.
If the type is unclear, use null. Do not pick a likely type.

bhks, only for flat, builder-floor, house, or penthouse: "1", "2", "3", "4+".
"4 BHK" or more = "4+". "Do BHK" = "2". "Teen BHK" = "3". If they accept 2 or 3, return both. Studio, plot, farmhouse, and commercial types do not get a BHK.

constructionStatus: "ready", "under-construction", or "any".
Ready to move = ready. Under construction = under-construction. Only use "any" when they say any status is fine.

locations: 1 to 3 area names they actually said, in English. Do not add nearby sectors.

budget: words such as "50 lakh" or "80L - 1Cr". Null if no amount is stated. "Assi lakh se ek crore" = "80L - 1Cr".

plotSizeMin, plotSizeMax, plotSizeUnit for plot, land, or farmhouse only.
plotSizeUnit must be "sq-yd", "marla", "kanal", or "sq-ft".
Gaj or square yard = sq-yd. Do not convert acres or square meters. If the unit is missing, all three are null.

areaMin and areaMax for office, shop/showroom, SCO/SCF/booth, or warehouse, in square feet only. Null if no number was said.

furnishing: "furnished", "semi", or "unfurnished".
floorPreference: "low", "mid", "high", or "any".
facing: "north", "south", "east", "west", "north-east", "north-west", "south-east", or "south-west".
parking: "required", "covered", "open", or "not-required".
amenities, only if they said it is a must: "lift", "security", "power-backup".
purpose: "self-use" or "investment".
homeLoan: "yes" or "no".
possessionTimeline: "immediately", "3-months", "6-months", or "1-year-plus".
followUpDate: YYYY-MM-DD, or null.

{
  "name": string | null,
  "phone": string | null,
  "locations": string[] | null,
  "budget": string | null,
  "intent": "buy" | "rent" | null,
  "category": "residential" | "commercial" | null,
  "propertyTypes": string[] | null,
  "bhks": ("1" | "2" | "3" | "4+")[] | null,
  "constructionStatus": "ready" | "under-construction" | "any" | null,
  "plotSizeMin": number | null,
  "plotSizeMax": number | null,
  "plotSizeUnit": "sq-yd" | "marla" | "kanal" | "sq-ft" | null,
  "areaMin": number | null,
  "areaMax": number | null,
  "furnishing": "furnished" | "semi" | "unfurnished" | null,
  "floorPreference": "low" | "mid" | "high" | "any" | null,
  "facing": string | null,
  "parking": string | null,
  "amenities": string[] | null,
  "purpose": "self-use" | "investment" | null,
  "homeLoan": "yes" | "no" | null,
  "possessionTimeline": "immediately" | "3-months" | "6-months" | "1-year-plus" | null,
  "source": string | null,
  "notes": string | null,
  "followUpDate": string | null
}

Today is ${new Date().toISOString().split("T")[0]}. If they say "tomorrow" or "kal" for a follow-up, use tomorrow's date. Do not assume a follow-up date when none is mentioned.`;
}

export async function POST(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) return unauthorized();

  // Temporary stop: voice is saved into notes on the client. Do not call the model.
  return Response.json(
    { error: "AI lead parsing is temporarily off" },
    { status: 503 },
  );

  try {
    const { text, language } = await request.json();

    if (!text?.trim()) {
      return Response.json({ error: "Text is required" }, { status: 400 });
    }

    if (!resolveAiProvider()) {
      return Response.json(
        { error: "AI service not configured" },
        { status: 503 },
      );
    }

    const langLabel =
      language === "hi-IN"
        ? "Hindi"
        : language === "pa-IN"
          ? "Punjabi"
          : language === "hinglish"
            ? "Hinglish"
            : "English";

    const raw = await completeAiText(
      extractionPrompt(text, langLabel),
      "Extract only lead fields that were explicitly stated in English, Hindi, or Hinglish. Map them to the allowed ids. Use null when a detail was not said. Never guess. Return only valid JSON.",
    );

    if (!raw.trim()) {
      return Response.json({ error: "Unexpected AI response" }, { status: 500 });
    }

    try {
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return Response.json(
          { error: "Could not parse AI response" },
          { status: 500 },
        );
      }
      return Response.json(sanitizeExtractedLead(JSON.parse(jsonMatch[0])));
    } catch {
      return Response.json(
        { error: "Could not parse AI response" },
        { status: 500 },
      );
    }
  } catch (error) {
    console.error("parse-lead error:", error);

    if (error instanceof Error && error.message === "AI_NOT_CONFIGURED") {
      return Response.json(
        { error: "AI service not configured" },
        { status: 503 },
      );
    }
    if (error instanceof Error && error.message === "UNEXPECTED_RESPONSE") {
      return Response.json({ error: "Unexpected AI response" }, { status: 500 });
    }

    const status = isAiAuthError(error) ? 503 : 500;
    const message = isAiAuthError(error)
      ? "AI service misconfigured"
      : "Failed to parse lead";

    return Response.json({ error: message }, { status });
  }
}
