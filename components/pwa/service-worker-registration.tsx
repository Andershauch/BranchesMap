"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { getDictionarySync } from "@/lib/i18n/dictionaries";
import type { AppLocale } from "@/lib/i18n/config";

const serviceWorkerPath = "/sw.js";
const updateCheckIntervalMs = 15 * 60 * 1000;

function PwaStatusBanner({
  locale,
  isOffline,
  updateReady,
  isApplyingUpdate,
  onApplyUpdate,
  onDismissUpdate,
}: {
  locale: AppLocale;
  isOffline: boolean;
  updateReady: boolean;
  isApplyingUpdate: boolean;
  onApplyUpdate: () => void;
  onDismissUpdate: () => void;
}) {
  const copy = getDictionarySync(locale).pwa;

  if (!isOffline && !updateReady) {
    return null;
  }

  const title = isOffline ? copy.offlineTitle : copy.updateTitle;
  const body = isOffline ? copy.offlineBody : copy.updateBody;

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-[calc(var(--app-header-height)+0.6rem)] z-[140] flex justify-center px-[max(0.85rem,var(--safe-left))] pr-[max(0.85rem,var(--safe-right))]"
    >
      <div
        role="status"
        aria-live="polite"
        className="pointer-events-auto w-full max-w-sm rounded-[1.35rem] border border-slate-200/80 bg-white/88 p-3 shadow-[0_16px_40px_rgba(15,23,42,0.14)] backdrop-blur-xl"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[var(--md-sys-color-on-surface)]">{title}</p>
            <p className="mt-1 text-xs leading-5 text-[var(--md-sys-color-on-surface-variant)]">
              {body}
            </p>
          </div>

          {updateReady ? (
            <button
              type="button"
              onClick={onDismissUpdate}
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-slate-200/80 bg-white/86 text-sm font-semibold text-[var(--md-sys-color-on-surface-variant)] transition hover:bg-white"
              aria-label={copy.updateLater}
            >
              ×
            </button>
          ) : null}
        </div>

        {updateReady ? (
          <div className="mt-3 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onApplyUpdate}
              disabled={isApplyingUpdate}
              className="inline-flex min-w-24 items-center justify-center rounded-full bg-[var(--md-sys-color-primary)] px-4 py-2 text-sm font-semibold text-[var(--md-sys-color-on-primary)] transition hover:opacity-95 disabled:cursor-wait disabled:opacity-70"
            >
              {isApplyingUpdate ? copy.updating : copy.updateAction}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function ServiceWorkerRegistration({ locale = "da" }: { locale?: AppLocale }) {
  const [isOffline, setIsOffline] = useState(
    () => (typeof window !== "undefined" ? !window.navigator.onLine : false),
  );
  const [updateReady, setUpdateReady] = useState(false);
  const [isApplyingUpdate, setIsApplyingUpdate] = useState(false);
  const [dismissedUpdate, setDismissedUpdate] = useState(false);
  const registrationRef = useRef<ServiceWorkerRegistration | null>(null);
  const reloadTriggeredRef = useRef(false);

  const shouldShowUpdate = useMemo(
    () => !isOffline && updateReady && !dismissedUpdate,
    [dismissedUpdate, isOffline, updateReady],
  );

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    function handleOnline() {
      setIsOffline(false);
    }

    function handleOffline() {
      setIsOffline(true);
    }

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  useEffect(() => {
    if (process.env.NODE_ENV !== "production") {
      return;
    }

    if (!("serviceWorker" in navigator)) {
      return;
    }

    let isMounted = true;
    let updateIntervalId: number | null = null;

    const checkForWaitingWorker = (registration: ServiceWorkerRegistration) => {
      if (!registration.waiting) {
        return;
      }

      registrationRef.current = registration;
      setUpdateReady(true);
      setDismissedUpdate(false);
    };

    const trackInstallingWorker = (
      worker: ServiceWorker | null,
      registration: ServiceWorkerRegistration,
    ) => {
      if (!worker) {
        return;
      }

      worker.addEventListener("statechange", () => {
        if (worker.state !== "installed" || !navigator.serviceWorker.controller) {
          return;
        }

        registrationRef.current = registration;
        setUpdateReady(true);
        setDismissedUpdate(false);
      });
    };

    const handleControllerChange = () => {
      if (reloadTriggeredRef.current) {
        return;
      }

      reloadTriggeredRef.current = true;
      window.location.reload();
    };

    const requestRegistrationUpdate = () => {
      const registration = registrationRef.current;
      if (!registration || !window.navigator.onLine) {
        return;
      }

      void registration.update().catch(() => {
        // Silent retry on the next focus/interval.
      });
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        requestRegistrationUpdate();
      }
    };

    const handleWindowFocus = () => {
      requestRegistrationUpdate();
    };

    void navigator.serviceWorker
      .register(serviceWorkerPath)
      .then((registration) => {
        if (!isMounted) {
          return;
        }

        registrationRef.current = registration;
        checkForWaitingWorker(registration);
        trackInstallingWorker(registration.installing, registration);

        registration.addEventListener("updatefound", () => {
          trackInstallingWorker(registration.installing, registration);
        });

        requestRegistrationUpdate();
        updateIntervalId = window.setInterval(requestRegistrationUpdate, updateCheckIntervalMs);
      })
      .catch((error: unknown) => {
        console.error("Service worker registration failed", error);
      });

    navigator.serviceWorker.addEventListener("controllerchange", handleControllerChange);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleWindowFocus);

    return () => {
      isMounted = false;

      if (updateIntervalId !== null) {
        window.clearInterval(updateIntervalId);
      }

      navigator.serviceWorker.removeEventListener("controllerchange", handleControllerChange);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleWindowFocus);
    };
  }, []);

  function applyUpdate() {
    const registration = registrationRef.current;
    if (!registration?.waiting) {
      window.location.reload();
      return;
    }

    setIsApplyingUpdate(true);
    reloadTriggeredRef.current = false;
    registration.waiting.postMessage({ type: "SKIP_WAITING" });

    window.setTimeout(() => {
      if (!reloadTriggeredRef.current) {
        window.location.reload();
      }
    }, 2500);
  }

  return (
    <PwaStatusBanner
      locale={locale}
      isOffline={isOffline}
      updateReady={shouldShowUpdate}
      isApplyingUpdate={isApplyingUpdate}
      onApplyUpdate={applyUpdate}
      onDismissUpdate={() => setDismissedUpdate(true)}
    />
  );
}
