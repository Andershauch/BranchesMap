import { intlLocaleMap, type AppLocale } from "@/lib/i18n/config";
import { getDictionarySync } from "@/lib/i18n/dictionaries";
import type { Dictionary } from "@/lib/i18n/schema";
import type { SecurityAuditEvent } from "@/lib/server/audit";

type SecurityEventsListProps = {
  locale: AppLocale;
  events: SecurityAuditEvent[];
  copyOverride?: Dictionary["adminHomeMap"];
};

function formatAdminDateTime(date: Date, locale: AppLocale) {
  return new Intl.DateTimeFormat(intlLocaleMap[locale], {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function formatSecurityAction(action: string) {
  return action.replace(/^security\./, "").replaceAll("_", " ");
}

function formatSecurityMetadata(metadata: unknown) {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return null;
  }

  return Object.entries(metadata as Record<string, unknown>)
    .filter(([, value]) => value !== null && value !== undefined && value !== "")
    .map(([key, value]) => `${key}: ${String(value)}`);
}

export function SecurityEventsList({ locale, events, copyOverride }: SecurityEventsListProps) {
  const text = copyOverride ?? getDictionarySync(locale).adminHomeMap;

  if (events.length === 0) {
    return (
      <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50/70 p-5 text-sm text-slate-600">
        {text.securityEmpty}
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      {events.map((event) => {
        const metadataLines = formatSecurityMetadata(event.metadata);
        const actor = event.user?.name?.trim() ? event.user.name : event.user?.email ?? text.securityActorFallback;

        return (
          <article
            key={event.id}
            className="rounded-[1.5rem] border border-slate-900/10 bg-white p-4 shadow-[0_14px_40px_rgba(15,23,42,0.05)]"
          >
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <p className="text-sm font-semibold capitalize text-slate-900">
                  {formatSecurityAction(event.action)}
                </p>
                <p className="mt-1 text-xs uppercase tracking-[0.16em] text-slate-500">
                  {event.entityType ?? text.securityEntityFallback}
                  {event.entityId ? ` · ${event.entityId}` : ""}
                </p>
              </div>
              <div className="text-xs text-slate-500 sm:text-right">
                <p>{formatAdminDateTime(event.createdAt, locale)}</p>
                <p dir="auto" className="mt-1">{actor}</p>
              </div>
            </div>

            {metadataLines && metadataLines.length > 0 ? (
              <ul className="mt-3 grid gap-1 text-sm text-slate-600">
                {metadataLines.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            ) : null}
          </article>
        );
      })}
    </div>
  );
}
