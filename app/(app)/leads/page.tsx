"use client";

import { Fragment, useCallback, useEffect, useState } from "react";
import type { Lead, LeadListResult } from "@/lib/types";
import { api } from "@/lib/api";
import { useAccess } from "@/components/AccessProvider";
import { LeadCard } from "@/components/LeadCard";
import { LeadDetailSheet } from "@/components/LeadDetailSheet";
import { AppPage } from "@/components/AppPage";
import { ListSkeleton } from "@/components/Loader";
import { ListPagination } from "@/components/ListPagination";
import { LeadListControls } from "@/components/LeadListControls";
import { OwnerFilter } from "@/components/OwnerFilter";
import { usePagination } from "@/hooks/usePagination";
import {
  detailedFilterCount,
  emptyLeadListQuery,
  hasLeadFilters,
  type LeadListQuery,
  type LeadSort,
} from "@/lib/lead-filters";
import { SlidersHorizontal, User } from "lucide-react";

const emptyResult: LeadListResult = {
  leads: [],
  total: 0,
  locations: [],
  owners: [],
  intentCounts: { buy: 0, rent: 0 },
};

export default function LeadsPage() {
  const { role } = useAccess();
  const isSuperAdmin = role === "SUPERADMIN";
  const [result, setResult] = useState<LeadListResult>(emptyResult);
  const [ownerId, setOwnerId] = useState("");
  const [nameInput, setNameInput] = useState("");
  const [nameQuery, setNameQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Lead | null>(null);
  const [query, setQuery] = useState<LeadListQuery>(emptyLeadListQuery);
  const [sort, setSort] = useState<LeadSort>("follow-up");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);

  const load = useCallback(() => {
    setReloadToken((token) => token + 1);
  }, []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    api
      .getLeads({ query, sort, ownerId, name: nameQuery })
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

  const leads = result.leads;
  const filterCount = detailedFilterCount(query);
  const filtersActive = hasLeadFilters(query) || Boolean(nameQuery) || Boolean(ownerId);

  const { page, setPage, totalPages, paginatedItems, pageSize, total } =
    usePagination(
      leads,
      `${JSON.stringify(query)}:${sort}:${ownerId}:${nameQuery}`,
    );

  return (
    <AppPage
      title="Leads"
      subtitle={
        loading
          ? "Loading…"
          : isSuperAdmin && !filtersActive
            ? "Each user's leads. Edit or delete, without adding new ones."
            : leads.length === result.total
              ? `${result.total} ${result.total === 1 ? "lead" : "leads"}`
              : `${leads.length} of ${result.total} leads`
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
            placeholder="Search a user who has leads"
          />
        ) : (
          <label className="block min-w-0">
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted">
              Search name
            </span>
            <input
              value={nameInput}
              placeholder="Search lead name"
              onChange={(event) => setNameInput(event.target.value)}
              className="w-full rounded-[10px] border border-border bg-surface px-3 py-2.5 text-sm text-primary outline-none focus:border-primary"
            />
          </label>
        )}
        <LeadListControls
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
        <ListSkeleton count={4} />
      ) : leads.length === 0 ? (
        <div className="rounded-2xl bg-surface px-4 py-9 text-center text-[13.5px] leading-relaxed text-muted">
          <User
            size={36}
            strokeWidth={1.5}
            className="mx-auto mb-3 text-upcoming"
          />
          {result.total === 0
            ? "No leads yet."
            : nameQuery
              ? "No leads match that name."
              : ownerId
                ? "This user has no leads in this filter."
                : "No leads match this filter."}
        </div>
      ) : (
        <>
          <div className="grid gap-2.5 lg:grid-cols-2 lg:gap-4">
            {paginatedItems.map((lead, index) => {
              const previous = paginatedItems[index - 1];
              const showOwner =
                isSuperAdmin &&
                !ownerId &&
                (index === 0 || previous?.userId !== lead.userId);

              return (
                <Fragment key={lead.id}>
                  {showOwner && (
                    <h2 className="col-span-full pt-1 text-xs font-semibold uppercase tracking-wide text-muted">
                      {lead.ownerName || "Unknown user"}
                    </h2>
                  )}
                  <LeadCard lead={lead} onClick={() => setSelected(lead)} />
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

      <LeadDetailSheet
        lead={selected}
        open={!!selected}
        onClose={() => {
          setSelected(null);
          load();
        }}
        onUpdate={async (id, data) => {
          await api.updateLead(id, data);
          load();
        }}
        onDelete={async (id) => {
          await api.deleteLead(id);
          load();
        }}
      />
    </AppPage>
  );
}
