import { useEffect, useCallback, useState, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { apiClient } from "@/lib/api";

const BADGE_PATHS = {
  registrations: "/admin/barangay/registrations",
  certificates: "/admin/barangay/certificates",
};

const STORAGE_KEY = "sidebar_badge_acknowledged";

function getAcknowledged() {
  try {
    return JSON.parse(sessionStorage.getItem(STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
}

function setAcknowledged(path, count) {
  const current = getAcknowledged();
  current[path] = count;
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(current));
}

export function useNotificationBadges(userType) {
  const { user } = useAuth();
  const location = useLocation();
  const barangayId = user?.target_id;
  const enabled = userType === "barangay" && !!barangayId;

  // Track acknowledged counts in state so badge updates reactively
  const [acknowledged, setAcknowledgedState] = useState(getAcknowledged);

  // Fetch pending registration count
  const { data: regData } = useQuery({
    queryKey: ["badge-registrations", barangayId],
    queryFn: () =>
      apiClient
        .get("/portal-registration/requests", {
          params: { status: "pending", barangayId, page: 1, limit: 1 },
        })
        .then((r) => r.data.data.pagination.total),
    enabled,
    refetchInterval: 30_000,
    staleTime: 15_000,
  });

  // Fetch pending certificate count
  const { data: certData } = useQuery({
    queryKey: ["badge-certificates", barangayId],
    queryFn: () =>
      apiClient
        .get("/certificates/queue", {
          params: { barangayId, status: "pending", perPage: 1, page: 1 },
        })
        .then((r) => r.data.pagination.total),
    enabled,
    refetchInterval: 30_000,
    staleTime: 15_000,
  });

  const pendingCounts = {
    [BADGE_PATHS.registrations]: regData ?? 0,
    [BADGE_PATHS.certificates]: certData ?? 0,
  };

  // When user navigates to a badge page, acknowledge the current count
  const prevPath = useRef(location.pathname);
  useEffect(() => {
    const path = location.pathname;
    if (path !== prevPath.current) {
      prevPath.current = path;
    }
    if (path in pendingCounts) {
      const count = pendingCounts[path];
      setAcknowledged(path, count);
      setAcknowledgedState((prev) => ({ ...prev, [path]: count }));
    }
  }, [location.pathname, pendingCounts[BADGE_PATHS.registrations], pendingCounts[BADGE_PATHS.certificates]]);

  // Compute badge counts: show when pending > acknowledged (new items arrived)
  const getBadgeCount = useCallback(
    (path) => {
      if (!enabled) return 0;
      const current = pendingCounts[path] ?? 0;
      if (current === 0) return 0;

      // If user is currently on this page, no badge
      if (location.pathname === path) return 0;

      const acked = acknowledged[path];
      // Never visited → show full count
      if (acked === undefined) return current;
      // New items since last visit
      return Math.max(0, current - acked);
    },
    [enabled, pendingCounts, location.pathname, acknowledged]
  );

  return {
    getBadgeCount,
    paths: BADGE_PATHS,
  };
}
