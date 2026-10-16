export const MAX_PROPERTY_PHOTOS = 12;
export const MIN_SALE_PRICE = 10000;
export const MAX_SALE_PRICE = 5_000_000_000;

export function boundedSalePriceError(amount: number, emptyMessage: string) {
  if (!amount) return emptyMessage;
  if (amount < MIN_SALE_PRICE) return "Enter a valid price of at least ₹10,000";
  if (amount > MAX_SALE_PRICE) return "Enter a price up to ₹500 crore";
  return "";
}

export type AreaKind = "apartment" | "built" | "plot" | "unit" | "flexible";

export type AreaField = "carpetArea" | "plotArea" | "builtUpArea" | "superBuiltUpArea";

export type ListingShapeInput = {
  category?: string | null;
  propertyType?: string | null;
  shopLocation?: string | null;
  carpetArea?: string | null;
  plotArea?: string | null;
  builtUpArea?: string | null;
  superBuiltUpArea?: string | null;
};

const APARTMENT_TYPES = new Set(["flat", "studio", "serviced-apartment", "penthouse"]);
const BUILT_HOME_TYPES = new Set(["builder-floor", "house", "farmhouse"]);
const COMMERCIAL_UNIT_TYPES = new Set(["office", "retail", "hospitality"]);
const COMMERCIAL_BUILT_TYPES = new Set(["sco", "storage", "industry"]);

function text(value?: string | null) {
  return value?.trim() ?? "";
}

export function areaKind(input: ListingShapeInput): AreaKind {
  const type = text(input.propertyType);
  if (input.category === "commercial") {
    if (type === "plot-land") return "plot";
    if (COMMERCIAL_UNIT_TYPES.has(type)) return "unit";
    if (COMMERCIAL_BUILT_TYPES.has(type)) return "built";
    return "flexible";
  }
  if (type === "plot") return "plot";
  if (BUILT_HOME_TYPES.has(type)) return "built";
  if (APARTMENT_TYPES.has(type)) return "apartment";
  return "flexible";
}

export function showsSocietyField(input: ListingShapeInput) {
  const type = text(input.propertyType);
  if (!type) return false;
  if (type === "plot" || type === "plot-land") return false;
  if (type === "builder-floor" || type === "house" || type === "farmhouse") return false;
  if (COMMERCIAL_BUILT_TYPES.has(type)) return false;
  return true;
}

export function addressNumberLabel(input: ListingShapeInput) {
  const type = text(input.propertyType);
  if (type === "plot" || type === "plot-land") return "Plot Number";
  if (COMMERCIAL_BUILT_TYPES.has(type)) return "Unit / Plot Number";
  if (showsSocietyField(input) && type !== "other") return "House / Flat Number";
  return "House / Unit Number";
}

export function hiddenAreaFields(input: ListingShapeInput): AreaField[] {
  const type = text(input.propertyType);
  if (input.category === "commercial" && type === "retail") {
    const hidden: AreaField[] = ["superBuiltUpArea"];
    if (text(input.shopLocation) !== "commercial-project") hidden.push("plotArea");
    return hidden;
  }
  if (input.category === "commercial" && type === "office") {
    return ["plotArea", "builtUpArea"];
  }
  const kind = areaKind(input);
  if (kind === "apartment" || kind === "unit") return ["plotArea", "builtUpArea"];
  if (kind === "built") return ["carpetArea", "superBuiltUpArea"];
  if (kind === "plot") return ["carpetArea", "builtUpArea", "superBuiltUpArea"];
  return [];
}

export function areaRequirementHint(input: ListingShapeInput) {
  const type = text(input.propertyType);
  if (input.category === "commercial" && type === "retail") return "Carpet area is mandatory.";
  if (input.category === "commercial" && type === "office") {
    return "Carpet area or super area is required.";
  }
  const kind = areaKind(input);
  if (kind === "apartment" || kind === "unit") return "Carpet area or super area is required.";
  if (kind === "built") return "Plot area or built-up area is required.";
  if (kind === "plot") return "Plot area is required.";
  return "At least one area type is mandatory.";
}

export function relevantAreaError(input: ListingShapeInput) {
  const type = text(input.propertyType);
  const carpet = text(input.carpetArea);
  const plot = text(input.plotArea);
  const built = text(input.builtUpArea);
  const superArea = text(input.superBuiltUpArea);

  if (input.category === "commercial" && type === "retail") {
    return carpet ? "" : "Carpet area is mandatory.";
  }
  if (input.category === "commercial" && type === "office") {
    return carpet || superArea ? "" : "Carpet area or super area is required.";
  }

  const kind = areaKind(input);
  if (kind === "apartment" || kind === "unit") {
    return carpet || superArea ? "" : "Carpet area or super area is required.";
  }
  if (kind === "built") {
    return plot || built ? "" : "Plot area or built-up area is required.";
  }
  if (kind === "plot") return plot ? "" : "Plot area is required.";
  return carpet || plot || built || superArea ? "" : "At least one area type is mandatory.";
}

export function pricingBasis(input: ListingShapeInput) {
  const type = text(input.propertyType);
  const carpet = text(input.carpetArea);
  const plot = text(input.plotArea);
  const built = text(input.builtUpArea);
  const superArea = text(input.superBuiltUpArea);

  if (input.category === "commercial" && type === "retail") {
    if (carpet) return { value: input.carpetArea ?? "", label: "Carpet Area" };
    if (built) return { value: input.builtUpArea ?? "", label: "Built-up Area" };
    return { value: input.plotArea ?? "", label: "Plot Area" };
  }
  if (input.category === "commercial" && type === "office") {
    if (superArea) return { value: input.superBuiltUpArea ?? "", label: "Super Area" };
    return { value: input.carpetArea ?? "", label: "Carpet Area" };
  }

  const kind = areaKind(input);
  if (kind === "plot") return { value: input.plotArea ?? "", label: "Plot Area" };
  if (kind === "built") {
    if (built) return { value: input.builtUpArea ?? "", label: "Built-up Area" };
    return { value: input.plotArea ?? "", label: "Plot Area" };
  }
  if (kind === "apartment" || kind === "unit") {
    if (superArea) return { value: input.superBuiltUpArea ?? "", label: "Super Area" };
    return { value: input.carpetArea ?? "", label: "Carpet Area" };
  }
  if (superArea) return { value: input.superBuiltUpArea ?? "", label: "Super Area" };
  if (built) return { value: input.builtUpArea ?? "", label: "Built-up Area" };
  if (carpet) return { value: input.carpetArea ?? "", label: "Carpet Area" };
  return { value: input.plotArea ?? "", label: "Plot Area" };
}

export function hiddenListingPatch(input: ListingShapeInput) {
  const patch: {
    carpetArea?: string;
    plotArea?: string;
    builtUpArea?: string;
    superBuiltUpArea?: string;
    society?: string;
    bedrooms?: string;
    bathrooms?: string;
    balconies?: string;
    furnishing?: string;
    propertyFloor?: string;
    totalFloors?: string;
    coveredParking?: string;
    openParking?: string;
  } = {};

  for (const field of hiddenAreaFields(input)) patch[field] = "";
  if (!showsSocietyField(input)) patch.society = "";
  if (areaKind(input) === "plot") {
    patch.bedrooms = "";
    patch.bathrooms = "";
    patch.balconies = "";
    patch.furnishing = "";
    patch.propertyFloor = "";
    patch.totalFloors = "";
    patch.coveredParking = "";
    patch.openParking = "";
  }
  return patch;
}
