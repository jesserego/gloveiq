import type { Artifact, BrandConfig } from "@gloveiq/shared";
const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8787";
async function json<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) throw new Error((await res.text().catch(() => "")) || `HTTP ${res.status}`);
  return (await res.json()) as T;
}
export const api = {
  brands: () => json<BrandConfig[]>(`${API_BASE}/brands`),
  artifacts: (q?: string) => json<Artifact[]>(`${API_BASE}/artifacts${q ? `?q=${encodeURIComponent(q)}` : ""}`),
  artifact: (id: string) => json<Artifact>(`${API_BASE}/artifact/${encodeURIComponent(id)}`),
  uploadPhoto: async (file: File) => {
    const fd = new FormData(); fd.append("file", file);
    return json<{ photo_id: string; deduped: boolean }>(`${API_BASE}/photos/upload`, { method: "POST", body: fd });
  },
};
