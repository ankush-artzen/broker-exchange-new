import type {
  Lead,
  LeadFormData,
  LeadListResult,
  ParsedLead,
  Property,
  PropertyFormData,
  PropertyListResult,
  OtpVerifyResult,
  User,
  UserProfileData,
} from "./types";
import {
  emptyLeadListQuery,
  type LeadListQuery,
  type LeadSort,
} from "./lead-filters";
import { leadListSearchParams } from "./lead-list-search";
import {
  emptyPropertyListQuery,
  type PropertyListQuery,
  type PropertySort,
} from "./property-filters";
import { propertyListSearch } from "./property-list-search";
import { isStaffRole } from "./roles";
import {
  clearStoredUser,
  getStoredRole,
  getStoredSessionToken,
} from "./storage";

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const sessionToken = getStoredSessionToken();
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };

  if (sessionToken) headers.Authorization = `Bearer ${sessionToken}`;
  if (options.body && !(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  const res = await fetch(path, { ...options, headers });
  const data = await res.json().catch(() => ({}));

  if (res.status === 401 && sessionToken && !path.startsWith("/api/auth/")) {
    const staff = isStaffRole(getStoredRole());
    clearStoredUser();
    if (typeof window !== "undefined") {
      window.location.assign(staff ? "/admin/login" : "/onboarding");
    }
  }

  if (!res.ok) {
    throw new Error(data.error || "Request failed");
  }

  return data as T;
}

export const api = {
  sendOtp(phone: string) {
    return request<{ ok: true; skipOtp?: boolean }>("/api/auth/send-otp", {
      method: "POST",
      body: JSON.stringify({ phone }),
    });
  },

  verifyOtp(phone: string, code: string) {
    return request<OtpVerifyResult>("/api/auth/verify-otp", {
      method: "POST",
      body: JSON.stringify({ phone, code }),
    });
  },

  identify(name: string, phone: string, verificationToken: string) {
    return request<User>("/api/users/identify", {
      method: "POST",
      body: JSON.stringify({ name, phone, verificationToken }),
    });
  },

  adminLogin(username: string, password: string) {
    return request<User>("/api/auth/admin-login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    });
  },

  getProfile() {
    return request<User>("/api/users/me");
  },

  listUsers() {
    return request<User[]>("/api/users");
  },

  createUser(data: {
    name: string;
    phone?: string;
    role?: "USER" | "ADMIN";
    username?: string;
    password?: string;
    userLimit?: number;
  }) {
    return request<User>("/api/users", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  updateUser(
    id: string,
    data: {
      name?: string;
      phone?: string;
      username?: string;
      password?: string;
      userLimit?: number;
      disabled?: boolean;
    },
  ) {
    return request<User>(`/api/users/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  },

  deleteUser(id: string) {
    return request<{ success: boolean }>(`/api/users/${id}`, {
      method: "DELETE",
    });
  },

  updateProfile(data: Partial<UserProfileData>) {
    return request<User>("/api/users/me", {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  },

  getLeads(params?: {
    query?: LeadListQuery;
    sort?: LeadSort;
    ownerId?: string;
    name?: string;
  }) {
    const search = params
      ? leadListSearchParams({
          query: params.query ?? emptyLeadListQuery(),
          sort: params.sort ?? "follow-up",
          ownerId: params.ownerId,
          name: params.name,
        }).toString()
      : "";
    return request<LeadListResult>(search ? `/api/leads?${search}` : "/api/leads");
  },

  getLead(id: string) {
    return request<Lead>(`/api/leads/${id}`);
  },

  getTodayLeads() {
    return request<Lead[]>("/api/leads/today");
  },

  createLead(data: LeadFormData) {
    return request<Lead>("/api/leads", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  updateLead(id: string, data: Partial<LeadFormData> & { followUpDone?: boolean }) {
    return request<Lead>(`/api/leads/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  },

  deleteLead(id: string) {
    return request<{ success: boolean }>(`/api/leads/${id}`, {
      method: "DELETE",
    });
  },

  getProperties(params?: {
    query?: PropertyListQuery;
    sort?: PropertySort;
    ownerId?: string;
    name?: string;
  }) {
    const search = params
      ? propertyListSearch({
          query: params.query ?? emptyPropertyListQuery(),
          sort: params.sort ?? "newest",
          ownerId: params.ownerId,
          name: params.name,
        })
      : "";
    return request<PropertyListResult>(
      search ? `/api/properties?${search}` : "/api/properties",
    );
  },

  getProperty(id: string) {
    return request<Property>(`/api/properties/${id}`);
  },

  createProperty(data: PropertyFormData) {
    return request<Property>("/api/properties", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  updateProperty(id: string, data: Partial<PropertyFormData>) {
    return request<Property>(`/api/properties/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  },

  deleteProperty(id: string) {
    return request<{ success: boolean }>(`/api/properties/${id}`, {
      method: "DELETE",
    });
  },

  parseLead(text: string, language: string) {
    return request<ParsedLead>("/api/ai/parse-lead", {
      method: "POST",
      body: JSON.stringify({ text, language }),
    });
  },

  suggestLeadRemarks(data: {
    name?: string | null;
    phone?: string | null;
    intent?: string | null;
    category?: string | null;
    propertyType?: string | null;
    propertyTypes?: string[] | null;
    bhk?: string | null;
    bhks?: string[] | null;
    location?: string | null;
    locations?: string[] | null;
    budget?: string | null;
    plotSize?: string | null;
    constructionStatus?: string | null;
    furnishing?: string | null;
    floorPreference?: string | null;
    facing?: string | null;
    parking?: string | null;
    amenities?: string[] | null;
    purpose?: string | null;
    homeLoan?: string | null;
    possessionTimeline?: string | null;
    temperature?: string | null;
    followUpDate?: string | null;
    notes?: string | null;
    status?: string | null;
  }) {
    return request<{ remarks: string }>("/api/ai/lead-remarks", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  uploadPhotos(files: File[]) {
    const form = new FormData();
    files.forEach((f) => form.append("files", f));
    return request<{ urls: string[] }>("/api/upload", {
      method: "POST",
      body: form,
    });
  },
};
