"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { Lead } from "@/lib/types";
import { api } from "@/lib/api";
import { getStoredUserProfile, type StoredUserProfile } from "@/lib/storage";
import {
  cn,
  formatLongDate,
  getGreeting,
  isTodayFollowUpTimePassed,
  shouldShowOnTodayPage,
} from "@/lib/utils";
import { useAccess } from "@/components/AccessProvider";
import { isStaffRole } from "@/lib/roles";
import { LeadCard } from "@/components/LeadCard";
import { LeadDetailSheet } from "@/components/LeadDetailSheet";
import { AppPage } from "@/components/AppPage";
import { ListSkeleton, StatSkeleton } from "@/components/Loader";
import { UserAvatar } from "@/components/UserAvatar";
import {
  AlarmClock,
  AlertCircle,
  CalendarClock,
  CircleCheck,
  LandPlot,
  type LucideIcon,
} from "lucide-react";

export default function TodayPage() {
  const { role } = useAccess();
  const staff = isStaffRole(role);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [propertiesCount, setPropertiesCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Lead | null>(null);
  const [now, setNow] = useState(() => new Date());
  const pathname = usePathname();
  const [userProfile, setUserProfile] = useState<StoredUserProfile | null>(null);
  const userName = userProfile?.name;
  const firstName = userName?.split(" ")[0] ?? "Broker";

  useEffect(() => {
    setUserProfile(getStoredUserProfile());
  }, [pathname]);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [leadsData, propertiesData] = await Promise.all([
        api.getTodayLeads(),
        api.getProperties(),
      ]);
      setLeads(leadsData);
      setPropertiesCount(propertiesData.total);
    } catch {
      setError("Failed to load data. Please try again.");
      setLeads([]);
      setPropertiesCount(0);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const { dueTodayCount, missedTodayCount, visibleLeads } = useMemo(() => {
    const visible = leads.filter((lead) => shouldShowOnTodayPage(lead, now));
    const missed = leads.filter((lead) =>
      isTodayFollowUpTimePassed(lead, now),
    );

    return {
      dueTodayCount: visible.length,
      missedTodayCount: missed.length,
      visibleLeads: visible,
    };
  }, [leads, now]);

  const dueActive = dueTodayCount > 0;
  const missedActive = missedTodayCount > 0;

  return (
    <AppPage
      header={
        <header className="mb-5 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-secondary">
              {formatLongDate()}
            </p>
            <h1 className="mt-1 font-serif text-[1.75rem] leading-tight text-primary sm:text-[1.85rem]">
              {getGreeting()}, {firstName}
            </h1>
          </div>
          <Link
            href="/account"
            aria-label="Go to account"
            className="rounded-full ring-2 ring-primary/35 ring-offset-2 ring-offset-background active:opacity-90"
          >
            <UserAvatar
              name={userName}
              imageUrl={userProfile?.profilePictureUrl}
              size={44}
            />
          </Link>
        </header>
      }
    >
      <div className="mb-7 grid grid-cols-3 gap-2 sm:gap-3">
        {loading ? (
          <>
            <StatSkeleton />
            <StatSkeleton />
            <StatSkeleton />
          </>
        ) : (
          <>
            <Stat
              value={dueTodayCount}
              label="Due today"
              icon={CalendarClock}
              tone={dueActive ? "today" : "plain"}
            />
            <Stat
              value={missedTodayCount}
              label="Time passed"
              icon={AlarmClock}
              tone={missedActive ? "alert" : "plain"}
            />
            <Stat
              value={propertiesCount}
              label="Properties"
              icon={LandPlot}
              href="/properties"
            />
          </>
        )}
      </div>

      {error && (
        <div className="mb-6 flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <p className="flex-1 text-sm">{error}</p>
          <button
            type="button"
            onClick={load}
            className="text-sm font-medium text-red-700"
          >
            Retry
          </button>
        </div>
      )}

      <section>
        <div className="mb-3 flex items-end justify-between gap-3">
          <h2 className="font-serif text-xl leading-none text-primary">
            Today&apos;s follow-ups
          </h2>
          {!loading && visibleLeads.length > 0 && (
            <span className="rounded-full bg-today-tint px-2.5 py-1 text-[11px] font-semibold text-today">
              {visibleLeads.length} left
            </span>
          )}
        </div>

        {loading ? (
          <ListSkeleton count={3} className="gap-3 lg:gap-4" />
        ) : visibleLeads.length === 0 ? (
          <div className="rounded-2xl border border-border/70 bg-surface px-6 py-10 text-center shadow-sm">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-ok-tint text-ok">
              <CircleCheck size={28} strokeWidth={1.75} />
            </span>
            <p className="mt-4 font-serif text-xl text-foreground">
              All caught up
            </p>
            <p className="mx-auto mt-1 max-w-[18rem] text-sm leading-relaxed text-muted">
              {missedActive
                ? `${missedTodayCount} follow-up${missedTodayCount === 1 ? "" : "s"} already passed ${missedTodayCount === 1 ? "its" : "their"} scheduled time.`
                : "No follow-ups left for today."}
            </p>
            {!staff && (
              <Link
                href="/leads/create"
                className="mt-5 inline-block rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground"
              >
                Add a lead
              </Link>
            )}
          </div>
        ) : (
          <div className="grid gap-3 lg:grid-cols-2 lg:gap-4">
            {visibleLeads.map((lead) => (
              <LeadCard
                key={lead.id}
                lead={lead}
                onClick={() => setSelected(lead)}
              />
            ))}
          </div>
        )}
      </section>

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

function Stat({
  value,
  label,
  icon: Icon,
  tone = "plain",
  href,
}: {
  value: number;
  label: string;
  icon: LucideIcon;
  tone?: "plain" | "today" | "alert";
  href?: string;
}) {
  const body = (
    <>
      <span
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
          tone === "alert" && "bg-white/70 text-overdue-muted",
          tone === "today" && "bg-white/70 text-today",
          tone === "plain" && "bg-secondary-tint text-secondary-dark",
        )}
      >
        <Icon size={15} strokeWidth={2} />
      </span>
      <span className="min-w-0 md:text-left">
        <span
          className={cn(
            "block font-serif text-[1.65rem] leading-none tabular-nums",
            tone === "alert" && "text-overdue-muted",
            tone === "today" && "text-today",
            tone === "plain" && "text-foreground",
          )}
        >
          {value}
        </span>
        <span className="mt-1 block text-[11px] font-medium leading-tight text-muted">
          {label}
        </span>
      </span>
    </>
  );

  const className = cn(
    "flex flex-col items-center gap-2 rounded-2xl border px-2 py-3.5 text-center shadow-sm md:flex-row md:gap-3 md:px-4 md:py-4 md:text-left",
    tone === "alert" && "border-overdue-muted/15 bg-overdue",
    tone === "today" && "border-today/15 bg-today-tint",
    tone === "plain" && "border-border/70 bg-surface",
    href && "transition-shadow hover:shadow-md active:bg-background",
  );

  if (href) {
    return (
      <Link href={href} className={className}>
        {body}
      </Link>
    );
  }

  return <div className={className}>{body}</div>;
}
