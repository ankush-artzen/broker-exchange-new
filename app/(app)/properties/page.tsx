"use client";

import { Fragment, useCallback, useEffect, useState } from "react";
import type { Property, PropertyListResult } from "@/lib/types";
import { api } from "@/lib/api";
import { useAccess } from "@/components/AccessProvider";
import { PropertyCard } from "@/components/PropertyCard";
import { PropertyDetailSheet } from "@/components/PropertyDetailSheet";
import { AppPage } from "@/components/AppPage";
import { PropertyListSkeleton } from "@/components/Loader";
import { ListPagination } from "@/components/ListPagination";
import { OwnerFilter } from "@/components/OwnerFilter";
import { PropertyListControls } from "@/components/PropertyListControls";
import { usePagination } from "@/hooks/usePagination";
import {
  detailedPropertyFilterCount,
  emptyPropertyListQuery,
  hasPropertyFilters,
  type PropertyListQuery,
  type PropertySort,
} from "@/lib/property-filters";
import { House, SlidersHorizontal } from "lucide-react";

const emptyResult: PropertyListResult = {
  properties: [],
  total: 0,
  locations: [],
  owners: [],
};

export default function PropertiesPage() {
  const { role } = useAccess();
  const isSuperAdmin = role === "SUPERADMIN";
  const [result, setResult] = useState<PropertyListResult>(emptyResult);
  const [ownerId, setOwnerId] = useState("");
  const [nameInput, setNameInput] = useState("");
  const [nameQuery, setNameQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Property | null>(null);
  const [query, setQuery] = useState<PropertyListQuery>(emptyPropertyListQuery);
  const [sort, setSort] = useState<PropertySort>("newest");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);

  const load = useCallback(() => {
    setReloadToken((token) => token + 1);
  }, []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    api
      .getProperties({ query, sort, ownerId, name: nameQuery })
      .then((data) => {
        if (active) setResult(data);
      })
      .catch(() => {
        if (active) setResult(emptyResult);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [query, sort, ownerId, nameQuery, reloadToken]);

  useEffect(() => {
    const timer = window.setTimeout(() => setNameQuery(nameInput.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [nameInput]);

  const properties = result.properties;
  const filterCount = detailedPropertyFilterCount(query);
  const filtersActive =
    hasPropertyFilters(query) || Boolean(nameQuery) || Boolean(ownerId);

  const { page, setPage, totalPages, paginatedItems, pageSize, total } =
    usePagination(
      properties,
      `${JSON.stringify(query)}:${sort}:${ownerId}:${nameQuery}`,
    );

  return (
    <AppPage
      title="Properties"
      subtitle={
        loading
          ? "Loading…"
          : isSuperAdmin && !filtersActive
            ? "Each user's properties. Edit or delete, without adding new ones."
            : properties.length === result.total
              ? `${result.total} ${result.total === 1 ? "property" : "properties"}`
              : `${properties.length} of ${result.total} properties`
      }
      action={
        <button
          type="button"
          onClick={() => setFiltersOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          <SlidersHorizontal size={16} />
          Filter
          {filterCount > 0 && (
            <span className="rounded-full bg-primary-foreground/20 px-1.5 text-[11px] tabular-nums">
              {filterCount}
            </span>
          )}
        </button>
      }
    >
      <div className="mb-4 grid grid-cols-1 items-start gap-3 md:grid-cols-[minmax(0,1fr)_15.5rem] md:gap-4">
        {isSuperAdmin ? (
          <OwnerFilter
            searchable
            className="relative min-w-0"
            users={result.owners}
            value={ownerId}
            onChange={setOwnerId}
            query={nameInput}
            onQueryChange={setNameInput}
            placeholder="Search a user who has properties"
          />
        ) : (
          <label className="block min-w-0">
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted">
              Search name
            </span>
            <input
              value={nameInput}
              placeholder="Search property name"
              onChange={(event) => setNameInput(event.target.value)}
              className="w-full rounded-[10px] border border-border bg-surface px-3 py-2.5 text-sm text-primary outline-none focus:border-primary"
            />
          </label>
        )}
        <PropertyListControls
          query={query}
          sort={sort}
          locations={result.locations}
          filtersOpen={filtersOpen}
          onFiltersOpenChange={setFiltersOpen}
          onQueryChange={setQuery}
          onSortChange={setSort}
        />
      </div>

      {loading ? (
        <PropertyListSkeleton count={3} />
      ) : properties.length === 0 ? (
        <div className="rounded-2xl bg-surface px-4 py-9 text-center text-[13.5px] leading-relaxed text-muted">
          <House
            size={36}
            strokeWidth={1.5}
            className="mx-auto mb-3 text-upcoming"
          />
          {result.total === 0
            ? "No properties yet."
            : nameQuery
              ? "No properties match that name."
              : ownerId
                ? "This user has no properties in this filter."
                : "No properties match this filter."}
        </div>
      ) : (
        <>
          <div className="grid gap-2.5 lg:grid-cols-2 lg:gap-4">
            {paginatedItems.map((property, index) => {
              const previous = paginatedItems[index - 1];
              const showOwner =
                isSuperAdmin &&
                !ownerId &&
                (index === 0 || previous?.userId !== property.userId);

              return (
                <Fragment key={property.id}>
                  {showOwner && (
                    <h2 className="col-span-full pt-1 text-xs font-semibold uppercase tracking-wide text-muted">
                      {property.ownerName || "Unknown user"}
                    </h2>
                  )}
                  <PropertyCard
                    property={property}
                    onClick={() => setSelected(property)}
                  />
                </Fragment>
              );
            })}
          </div>
          <ListPagination
            page={page}
            totalPages={totalPages}
            total={total}
            pageSize={pageSize}
            onPageChange={setPage}
          />
        </>
      )}

      <PropertyDetailSheet
        property={selected}
        open={!!selected}
        onClose={() => {
          setSelected(null);
          load();
        }}
        onDelete={async (id) => {
          await api.deleteProperty(id);
          load();
        }}
      />
    </AppPage>
  );
}
