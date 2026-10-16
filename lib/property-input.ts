import { rentAmountError, salePriceError } from "@/components/property-form/helpers";
import { MAX_PROPERTY_PHOTOS } from "@/lib/listing-shape";
import { optionalText, photoUrlsFrom } from "@/lib/property-listing";

const AVAILABILITY = new Set(["available", "reserved", "sold"]);

export function listingInputError(body: Record<string, unknown>) {
  if ("availability" in body) {
    const availability = optionalText(body.availability);
    if (availability && !AVAILABILITY.has(availability)) {
      return "Choose a valid availability status";
    }
  }

  if (photoUrlsFrom(body.photoUrls).length > MAX_PROPERTY_PHOTOS) {
    return `You can add up to ${MAX_PROPERTY_PHOTOS} photos`;
  }

  if (!("price" in body)) return "";
  const price = optionalText(body.price) ?? "";
  if (!price || /lakh|crore|thousand/i.test(price)) return "";

  const intent = optionalText(body.intent);
  const category = optionalText(body.category);
  const propertyType = optionalText(body.propertyType);
  const monthlyRent =
    intent === "rent" &&
    category === "residential" &&
    propertyType !== "plot" &&
    propertyType !== "builder-floor";

  return monthlyRent
    ? rentAmountError(price, "Price is required")
    : salePriceError(price, "Price is required");
}
