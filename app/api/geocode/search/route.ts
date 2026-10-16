import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  const kind = request.nextUrl.searchParams.get("kind");
  const near = request.nextUrl.searchParams.get("near")?.trim();

  if (kind === "society") {
    return NextResponse.json({ results: await societyResults(q, near) });
  }

  if (!q || q.length < 2) {
    return NextResponse.json({ results: [] });
  }

  const query = near && kind !== "state" ? `${q}, ${near}` : q;

  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", query);
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "6");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("countrycodes", "in");
  if (kind === "city") url.searchParams.set("featuretype", "city");
  if (kind === "state") url.searchParams.set("featuretype", "state");

  const res = await fetch(url, {
    headers: { "User-Agent": "PrimeBrokers/1.0 (broker-exchange-app)" },
  });

  if (!res.ok) {
    return NextResponse.json({ error: "Search failed" }, { status: 502 });
  }

  const data = (await res.json()) as NominatimPlace[];

  return NextResponse.json({
    results: data.map((item) => {
      const address = item.address;
      const city = cityOf(address, kind === "city" ? item.name : undefined);
      const locality = localityOf(address);
      return {
        label: item.display_name,
        name: item.name || city || item.display_name.split(",")[0] || "",
        state: address?.state || (kind === "state" ? item.name || "" : ""),
        city,
        locality,
        subLocality: subLocalityOf(address),
        lat: parseFloat(item.lat),
        lon: parseFloat(item.lon),
      };
    }),
  });
}

type NominatimAddress = {
  city?: string;
  town?: string;
  village?: string;
  municipality?: string;
  state?: string;
  suburb?: string;
  neighbourhood?: string;
  city_district?: string;
  quarter?: string;
};

type NominatimPlace = {
  display_name: string;
  name?: string;
  lat: string;
  lon: string;
  class?: string;
  type?: string;
  addresstype?: string;
  address?: NominatimAddress;
};

type SocietyHit = {
  label: string;
  name: string;
  state: string;
  city: string;
  locality: string;
  subLocality: string;
  lat: number;
  lon: number;
};

type OverpassElement = {
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: {
    name?: string;
    "addr:city"?: string;
    "addr:suburb"?: string;
    "addr:neighbourhood"?: string;
  };
};

const SOCIETY_TTL_MS = 15 * 60 * 1000;
const societyCache = new Map<string, { at: number; places: SocietyHit[] }>();
const societyPending = new Map<string, Promise<SocietyHit[]>>();

async function societyResults(q: string, near?: string) {
  const city = near?.split(",")[0]?.trim() || "";
  const needle = q.trim().toLowerCase();

  if (!needle || needle.length < 2) {
    const listed = city ? await societiesNear(near || city, city) : [];
    return listed.slice(0, 12);
  }

  const cached = cachedSocieties(near || city);
  const fromCache = (cached ?? []).filter((place) =>
    matchesQuery(place.name, place.label, needle),
  );
  if (fromCache.length > 0) return fromCache.slice(0, 12);

  const found = (await nominatimSocieties(q, near)).filter((place) =>
    matchesQuery(place.name, place.label, needle),
  );
  if (found.length > 0) return found.slice(0, 12);

  const typed = await typedSociety(q, near, city);
  return typed ? [typed] : [];
}

function cachedSocieties(near: string) {
  const cached = societyCache.get(near.trim().toLowerCase());
  if (!cached || Date.now() - cached.at >= SOCIETY_TTL_MS) return null;
  return cached.places;
}

function matchesQuery(name: string, label: string, needle: string) {
  const haystack = `${name} ${label}`.toLowerCase();
  const tokens = needle.split(/\s+/).filter((token) => token.length >= 2);
  return tokens.length > 0 && tokens.every((token) => haystack.includes(token));
}

async function typedSociety(q: string, near: string | undefined, city: string) {
  const name = presentName(q);
  if (name.length < 3 || !city || sameText(name, city)) return null;
  const point = await locate(near || city);
  if (!point) return null;
  const state = point.state || near?.split(",")[1]?.trim() || "";
  return {
    label: [name, city, state].filter(Boolean).join(", "),
    name,
    state,
    city,
    locality: "",
    subLocality: "",
    lat: point.lat,
    lon: point.lon,
  };
}

function presentName(value: string) {
  const name = value.trim().replace(/\s+/g, " ");
  if (/[A-Z]/.test(name)) return name;
  return name.replace(/\b[a-z]/g, (letter) => letter.toUpperCase());
}

async function societiesNear(near: string, city: string) {
  const key = near.trim().toLowerCase();
  const cached = societyCache.get(key);
  if (cached && Date.now() - cached.at < SOCIETY_TTL_MS) return cached.places;

  const pending = societyPending.get(key);
  if (pending) return pending;

  const job = loadSocieties(near, city)
    .then((places) => {
      if (places.length > 0) societyCache.set(key, { at: Date.now(), places });
      return places;
    })
    .finally(() => {
      societyPending.delete(key);
    });
  societyPending.set(key, job);
  return job;
}

async function loadSocieties(near: string, city: string) {
  const point = await locate(near);
  if (!point) return [];

  const query = `[out:json][timeout:12];
(
  nwr["name"]["landuse"="residential"](around:6500,${point.lat},${point.lon});
  nwr["name"]["building"="apartments"](around:6500,${point.lat},${point.lon});
  nwr["name"]["residential"="apartments"](around:6500,${point.lat},${point.lon});
);
out tags center 80;`;

  try {
    const res = await fetch("https://overpass-api.de/api/interpreter", {
      method: "POST",
      headers: {
        "User-Agent": "PrimeBrokers/1.0 (broker-exchange-app)",
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ data: query }),
      cache: "no-store",
      signal: AbortSignal.timeout(14000),
    });
    if (!res.ok) return [];
    const data = (await res.json()) as { elements?: OverpassElement[] };
    return societyHits(data.elements ?? [], city, point.state);
  } catch {
    return [];
  }
}

function societyHits(
  elements: OverpassElement[],
  city: string,
  state: string,
) {
  const seen = new Set<string>();
  const places: SocietyHit[] = [];

  for (const element of elements) {
    const raw = element.tags?.name?.trim() || "";
    const name = raw.replace(/\s+tower(?:\s*[- ]?\s*[a-z0-9]+)?$/i, "").replace(/\s+/g, " ").trim();
    const key = name.toLowerCase();
    if (!name || seen.has(key) || !keepSociety(name, city)) continue;
    const taggedCity = element.tags?.["addr:city"]?.trim();
    if (taggedCity && !sameText(taggedCity, city) && !taggedCity.toLowerCase().includes(city.toLowerCase())) {
      continue;
    }
    const lat = element.lat ?? element.center?.lat;
    const lon = element.lon ?? element.center?.lon;
    if (typeof lat !== "number" || typeof lon !== "number") continue;
    seen.add(key);
    const locality = element.tags?.["addr:suburb"] || element.tags?.["addr:neighbourhood"] || "";
    places.push({
      label: [name, locality, city, state].filter(Boolean).join(", "),
      name,
      state,
      city,
      locality,
      subLocality: "",
      lat,
      lon,
    });
  }

  return places.sort((a, b) => a.name.localeCompare(b.name));
}

function keepSociety(name: string, city: string) {
  if (name.length < 3 || sameText(name, city)) return false;
  return !/^(tower|sector|block|floor)\b/i.test(name);
}

async function locate(near: string) {
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", near);
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "1");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("countrycodes", "in");

  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "PrimeBrokers/1.0 (broker-exchange-app)" },
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as NominatimPlace[];
    const place = data[0];
    if (!place) return null;
    return {
      lat: parseFloat(place.lat),
      lon: parseFloat(place.lon),
      state: place.address?.state || near.split(",")[1]?.trim() || "",
    };
  } catch {
    return null;
  }
}

async function nominatimSocieties(q: string, near?: string) {
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", near ? `${q}, ${near}` : q);
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "8");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("countrycodes", "in");

  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "PrimeBrokers/1.0 (broker-exchange-app)" },
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return [];
    const data = (await res.json()) as NominatimPlace[];
    const city = near?.split(",")[0]?.trim() || "";
    return data.flatMap((item) => {
      const name = societyTitle(item, q);
      if (!name || sameText(name, city)) return [];
      const address = item.address;
      return [
        {
          label: item.display_name,
          name,
          state: address?.state || near?.split(",")[1]?.trim() || "",
          city: cityOf(address, undefined) || city,
          locality: localityOf(address),
          subLocality: subLocalityOf(address),
          lat: parseFloat(item.lat),
          lon: parseFloat(item.lon),
        },
      ];
    });
  } catch {
    return [];
  }
}

function societyTitle(item: NominatimPlace, needle: string) {
  if (item.name?.trim()) return item.name.trim();
  const query = needle.trim().toLowerCase();
  const part = item.display_name
    .split(",")
    .map((piece) => piece.trim())
    .find((piece) => piece && piece.toLowerCase().includes(query));
  return part || "";
}

function sameText(a: string, b: string) {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

function cityOf(address?: NominatimAddress, name?: string) {
  return (
    address?.city ||
    address?.town ||
    address?.village ||
    address?.municipality ||
    name ||
    ""
  );
}

function localityOf(address?: NominatimAddress) {
  return (
    address?.suburb ||
    address?.neighbourhood ||
    address?.city_district ||
    address?.quarter ||
    ""
  );
}

function subLocalityOf(address?: NominatimAddress) {
  if (address?.suburb && address.neighbourhood && address.suburb !== address.neighbourhood) {
    return address.neighbourhood;
  }
  return "";
}
