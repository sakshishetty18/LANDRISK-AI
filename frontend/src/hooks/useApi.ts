import { useCallback, useEffect, useState } from "react";

export function useApi<T>(fn: () => Promise<T>, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(() => {
    setLoading(true);
    setError(null);
    fn()
      .then((res) => setData(res))
      .catch((e) => setError(e?.response?.data?.detail || e.message || "Request failed"))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    reload();
  }, [reload]);

  return { data, loading, error, reload, setData };
}

export function formatFeatureName(name: string): string {
  return name
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export function riskStatus(category: string | undefined | null): string {
  if (!category) return "Low";
  const c = category.toUpperCase();
  if (c === "CRITICAL") return "Critical";
  if (c === "HIGH") return "High";
  if (c === "MEDIUM") return "Medium";
  return "Low";
}

export function riskTone(category: string | undefined | null): string {
  const c = (category || "").toUpperCase();
  if (c === "CRITICAL") return "red";
  if (c === "HIGH") return "orange";
  if (c === "MEDIUM") return "amber";
  return "green";
}

/** Formats a raw INR amount (as stored by the backend) as ₹X.XX Cr / ₹X.XX L. */
export function formatINR(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || Number.isNaN(amount)) return "—";
  if (amount >= 1e7) return `₹${(amount / 1e7).toFixed(2)} Cr`;
  if (amount >= 1e5) return `₹${(amount / 1e5).toFixed(2)} L`;
  return `₹${amount.toLocaleString("en-IN")}`;
}
