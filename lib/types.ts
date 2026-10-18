export type Role = "USER" | "ADMIN" | "SUPERADMIN";

export interface User {
  id: string;
  name: string;
  phone: string | null;
  username?: string | null;
  role: Role;
  canAddUsers?: boolean;
  userLimit?: number;
  usersCreated?: number;
  disabled?: boolean;
  createdByName?: string | null;
  profilePictureUrl?: string | null;
  createdAt: string;
  sessionToken?: string;
}

export type UserProfileData = Pick<User, "name" | "phone" | "profilePictureUrl">;

export interface OtpVerifyResult {
  verified: true;
  token: string;
  user: User | null;
}

export interface LeadListResult {
  leads: Lead[];
  total: number;
  locations: string[];
  owners: { id: string; name: string }[];
  intentCounts: { buy: number; rent: number };
}

export interface Lead {
  id: string;
  userId: string;
  ownerName?: string | null;
  name: string;
  phone: string;
  requirement?: string | null;
  location?: string | null;
  budget?: string | null;
  budgetMin?: number | null;
  budgetMax?: number | null;
  intent?: string | null;
  category?: string | null;
  propertyType?: string | null;
  propertyTypes?: string[];
  bhk?: string | null;
  bhks?: string[];
  constructionStatus?: string | null;
  temperature?: string | null;
  plotSize?: string | null;
  plotSizeMin?: number | null;
  plotSizeMax?: number | null;
  plotSizeUnit?: string | null;
  areaMin?: number | null;
  areaMax?: number | null;
  areaUnit?: string | null;
  furnishing?: string | null;
  floorPreference?: string | null;
  facing?: string | null;
  parking?: string | null;
  amenities?: string[];
  purpose?: string | null;
  homeLoan?: string | null;
  possessionTimeline?: string | null;
  locations?: string[];
  source?: string | null;
  notes?: string | null;
  remarks?: string | null;
  followUpDate?: string | null;
  followUpDone: boolean;
  status?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PropertyListResult {
  properties: Property[];
  total: number;
  locations: string[];
  owners: { id: string; name: string }[];
}

export interface Property {
  id: string;
  userId: string;
  ownerName?: string | null;
  title: string;
  location: string;
  price: string;
  configuration?: string | null;
  area?: string | null;
  availability?: string | null;
  notes?: string | null;
  photoUrls: string[];
  intent?: string | null;
  category?: string | null;
  propertyType?: string | null;
  officeType?: string | null;
  retailType?: string | null;
  shopLocation?: string | null;
  shopWashroom?: string | null;
  parkingType?: string | null;
  entranceWidth?: string | null;
  ceilingHeight?: string | null;
  bookingAmount?: string | null;
  industryType?: string | null;
  hospitalityType?: string | null;
  qualityRating?: string | null;
  plotType?: string | null;
  storageType?: string | null;
  minWorkstations?: string | null;
  maxWorkstations?: string | null;
  cabins?: string | null;
  meetingRooms?: string | null;
  washroomAvailability?: string | null;
  conferenceRoom?: string | null;
  receptionArea?: string | null;
  pantryType?: string | null;
  facilityParking?: string | null;
  centralAc?: string | null;
  lifts?: string | null;
  parkingAvailability?: string | null;
  preLeased?: string | null;
  currentRent?: string | null;
  leaseTenure?: string | null;
  annualRentIncrement?: string | null;
  leasedTo?: string | null;
  dgUpsIncluded?: boolean | null;
  state?: string | null;
  city?: string | null;
  locality?: string | null;
  subLocality?: string | null;
  society?: string | null;
  houseNumber?: string | null;
  bedrooms?: string | null;
  bathrooms?: string | null;
  balconies?: string | null;
  additionalRooms?: string[];
  furnishing?: string | null;
  totalFloors?: string | null;
  propertyFloor?: string | null;
  possession?: string | null;
  propertyAge?: string | null;
  possessionBy?: string | null;
  areaType?: string | null;
  carpetArea?: string | null;
  plotArea?: string | null;
  builtUpArea?: string | null;
  superBuiltUpArea?: string | null;
  facing?: string | null;
  powerBackup?: string | null;
  flooring?: string | null;
  coveredParking?: string | null;
  openParking?: string | null;
  waterSource?: string | null;
  ownership?: string | null;
  postedAs?: string | null;
  negotiable?: boolean | null;
  allInclusive?: boolean | null;
  priceDetails?: string | null;
  maintenance?: string | null;
  deposit?: string | null;
  preferredTenant?: string | null;
  preferredTenants?: string[];
  availableFrom?: string | null;
  brokerContact?: string | null;
  chargesExcluded?: boolean | null;
  plotLength?: string | null;
  plotBreadth?: string | null;
  boundaryWall?: string | null;
  openSides?: string | null;
  floorsAllowed?: string | null;
  constructionDone?: string | null;
  constructionTypes?: string[];
  approvedBy?: string | null;
  amenities?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ParsedLead {
  name?: string | null;
  phone?: string | null;
  requirement?: string | null;
  location?: string | null;
  locations?: string[] | null;
  budget?: string | null;
  intent?: string | null;
  category?: string | null;
  propertyType?: string | null;
  propertyTypes?: string[] | null;
  bhk?: string | null;
  bhks?: string[] | null;
  constructionStatus?: string | null;
  plotSize?: string | null;
  plotSizeMin?: number | null;
  plotSizeMax?: number | null;
  plotSizeUnit?: string | null;
  areaMin?: number | null;
  areaMax?: number | null;
  furnishing?: string | null;
  floorPreference?: string | null;
  facing?: string | null;
  parking?: string | null;
  amenities?: string[] | null;
  purpose?: string | null;
  homeLoan?: string | null;
  possessionTimeline?: string | null;
  source?: string | null;
  notes?: string | null;
  followUpDate?: string | null;
}

export type LeadFormData = Omit<
  Lead,
  "id" | "userId" | "createdAt" | "updatedAt" | "followUpDone"
> & {
  followUpDone?: boolean;
  status?: string | null;
  /** When true, blank requirement dropdowns are stored as blank instead of re-parsed from text. */
  explicitStructured?: boolean;
};

export type PropertyFormData = Omit<
  Property,
  "id" | "userId" | "createdAt" | "updatedAt"
>;

export type SpeechLanguage = "en-IN" | "hi-IN" | "pa-IN" | "hinglish";
