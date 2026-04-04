import React from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { Check } from "lucide-react";

const EX_BASE =
  typeof window !== "undefined"
    ? `${window.location.origin}/api/openapi`
    : "https://<your-domain>/api/openapi";

const json = (obj) => JSON.stringify(obj, null, 2);

const residentsSchema = {
  success: true,
  data: [
    {
      id: "uuid",
      resident_id: "RES-YYYY-NNNNNNN",
      barangay_id: 0,
      last_name: "string",
      first_name: "string",
      middle_name: "string|null",
      extension_name: "string|null",
      sex: "male|female",
      civil_status: "single|married|widowed|separated",
      birthdate: "ISODate",
      birth_region: "string|null",
      contact_number: "string|null",
      email: "string|null",
      occupation: "string|null",
      monthly_income: "number|null",
      employment_status: "string|null",
      education_attainment: "string|null",
      status: "active|pending|inactive",
      picture_path: "string|null",
      indigenous_person: false,
      created_at: "ISODate",
      updated_at: "ISODate",
    },
  ],
  pagination: { page: 1, limit: 20, total: 1, pages: 1 },
};

const householdsSchema = {
  success: true,
  data: [
    {
      id: 0,
      house_number: "string|null",
      street: "string|null",
      barangay_id: 0,
      house_head: "resident_id",
      housing_type: "Owned|Rented|Informal",
      structure_type: "Concrete|Wood|Light|Mixed",
    },
  ],
  pagination: { page: 1, limit: 10, total: 0, pages: 0 },
};

const familiesSchema = {
  success: true,
  data: [
    {
      id: 0,
      household_id: 0,
      family_group: "string",
      family_head: "resident_id",
    },
  ],
  pagination: { page: 1, limit: 10, total: 0, pages: 0 },
};

const barangaysSchema = {
  success: true,
  data: [
    {
      id: 0,
      barangay_name: "string",
      barangay_code: "string",
      contact_number: "string",
      email: "string",
    },
  ],
  pagination: { page: 1, limit: 10, total: 0, pages: 0 },
};

const statisticsSchema = {
  success: true,
  data: {
    residents: { total: 0, male: 0, female: 0 },
    households: { total: 0 },
    families: { total: 0 },
  },
};

const endpoints = [
  {
    id: "residents",
    title: "Residents",
    path: "/residents",
    desc: "List residents with optional search by resident ID.",
    params: [
      { name: "page", type: "int", required: false, note: "Default: 1" },
      { name: "limit", type: "int", required: false, note: "Default: 10" },
      { name: "q", type: "string", required: false, note: "Search by resident_id, e.g. RES-2026-0010002 (partial match)" },
    ],
    schema: residentsSchema,
    sampleCurl: `curl -sS "${EX_BASE}/residents?page=1&limit=10" \\\n  -H "X-API-KEY: <your_api_key>"`,
    sampleJs: `const res = await fetch("${EX_BASE}/residents?page=1&limit=10", {\n  headers: { "X-API-KEY": "<your_api_key>" },\n});\nconst data = await res.json();`,
  },
  {
    id: "households",
    title: "Households",
    path: "/households",
    desc: "List households.",
    params: [
      { name: "page", type: "int", required: false, note: "Default: 1" },
      { name: "limit", type: "int", required: false, note: "Default: 10" },
    ],
    schema: householdsSchema,
    sampleCurl: `curl -sS "${EX_BASE}/households?page=1&limit=10" \\\n  -H "X-API-KEY: <your_api_key>"`,
    sampleJs: `const res = await fetch("${EX_BASE}/households?page=1&limit=10", {\n  headers: { "X-API-KEY": "<your_api_key>" },\n});\nconst data = await res.json();`,
  },
  {
    id: "families",
    title: "Families",
    path: "/families",
    desc: "List families.",
    params: [
      { name: "page", type: "int", required: false, note: "Default: 1" },
      { name: "limit", type: "int", required: false, note: "Default: 10" },
    ],
    schema: familiesSchema,
    sampleCurl: `curl -sS "${EX_BASE}/families?page=1&limit=10" \\\n  -H "X-API-KEY: <your_api_key>"`,
    sampleJs: `const res = await fetch("${EX_BASE}/families?page=1&limit=10", {\n  headers: { "X-API-KEY": "<your_api_key>" },\n});\nconst data = await res.json();`,
  },
  {
    id: "barangays",
    title: "Barangays",
    path: "/barangays",
    desc: "List barangays.",
    params: [
      { name: "page", type: "int", required: false, note: "Default: 1" },
      { name: "limit", type: "int", required: false, note: "Default: 10" },
    ],
    schema: barangaysSchema,
    sampleCurl: `curl -sS "${EX_BASE}/barangays?page=1&limit=10" \\\n  -H "X-API-KEY: <your_api_key>"`,
    sampleJs: `const res = await fetch("${EX_BASE}/barangays?page=1&limit=10", {\n  headers: { "X-API-KEY": "<your_api_key>" },\n});\nconst data = await res.json();`,
  },
  {
    id: "statistics",
    title: "Statistics",
    path: "/statistics",
    desc: "Aggregate counts for residents, households, and families.",
    params: [],
    schema: statisticsSchema,
    sampleCurl: `curl -sS "${EX_BASE}/statistics" \\\n  -H "X-API-KEY: <your_api_key>"`,
    sampleJs: `const res = await fetch("${EX_BASE}/statistics", {\n  headers: { "X-API-KEY": "<your_api_key>" },\n});\nconst data = await res.json();`,
  },
];

const NAV_GROUPS = [
  {
    label: "GUIDES",
    items: [
      { id: "overview", label: "Overview" },
      { id: "authentication", label: "Authentication" },
      { id: "rate-limits", label: "Rate Limits" },
      { id: "scopes", label: "Scopes" },
      { id: "error-codes", label: "Error Codes" },
    ],
  },
  {
    label: "ENDPOINTS",
    items: endpoints.map((e) => ({
      id: `ep-${e.id}`,
      label: `GET ${e.path}`,
    })),
  },
];

const TRY_IT_ID = "try-it";

const DeveloperPortal = () => {
  const [activeSection, setActiveSection] = React.useState("overview");
  const [apiKey, setApiKey] = React.useState("");
  const [savedKeyAt, setSavedKeyAt] = React.useState(0);
  const [liveMsg, setLiveMsg] = React.useState("");
  const [tryEndpoint, setTryEndpoint] = React.useState("residents");
  const [tryParams, setTryParams] = React.useState({ page: "1", limit: "10", q: "" });
  const [tryResponse, setTryResponse] = React.useState("");
  const [tryStatus, setTryStatus] = React.useState("");
  const [retryAfter, setRetryAfter] = React.useState("");
  const { toast } = useToast();

  // Restore API key from sessionStorage on mount
  React.useEffect(() => {
    const saved = sessionStorage.getItem("devPortalApiKey");
    if (saved) setApiKey(saved);
  }, []);

  // Highlight active sidebar link based on visible section
  React.useEffect(() => {
    const allIds = [
      ...NAV_GROUPS.flatMap((g) => g.items.map((i) => i.id)),
      TRY_IT_ID,
    ];
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActiveSection(entry.target.id);
        });
      },
      { rootMargin: "-10% 0px -75% 0px", threshold: 0 }
    );
    allIds.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  const saveKey = () => {
    sessionStorage.setItem("devPortalApiKey", apiKey);
    setSavedKeyAt(Date.now());
    setLiveMsg("API key saved for Try It requests");
    toast({ title: "API key saved", description: "Used by Try It requests", duration: 2000 });
    setTimeout(() => setSavedKeyAt(0), 1600);
  };

  const runTry = async () => {
    const ep = endpoints.find((e) => e.id === tryEndpoint);
    if (!ep) return;
    const url = new URL(`${EX_BASE}${ep.path}`);
    if (tryParams.page) url.searchParams.set("page", tryParams.page);
    if (tryParams.limit) url.searchParams.set("limit", tryParams.limit);
    if (tryEndpoint === "residents" && tryParams.q) url.searchParams.set("q", tryParams.q);
    setTryStatus("Loading...");
    setTryResponse("");
    setRetryAfter("");
    try {
      const res = await fetch(url.toString(), { headers: { "X-API-KEY": apiKey } });
      setTryStatus(`${res.status} ${res.statusText}`);
      const ra = res.headers.get("Retry-After");
      if (ra) setRetryAfter(ra);
      const jsonBody = await res.json().catch(() => ({}));
      setTryResponse(json(jsonBody));
    } catch (e) {
      setTryStatus(`Error: ${e.message}`);
      setTryResponse("");
    }
  };

  const navLinkClass = (id) =>
    [
      "block w-full text-left px-3 py-1.5 text-sm rounded-sm transition-colors",
      activeSection === id
        ? "border-l-2 border-blue-600 text-blue-600 bg-blue-50 font-medium pl-2.5"
        : "text-slate-600 hover:text-slate-900 hover:bg-slate-100",
    ].join(" ");

  return (
    <div className="flex h-screen overflow-hidden bg-white">
      {/* ── Sidebar ── */}
      <aside className="w-60 flex-shrink-0 border-r border-slate-200 bg-slate-50 overflow-y-auto">
        <div className="p-4 border-b border-slate-200">
          <div className="font-bold text-sm text-slate-900 tracking-tight">BIMS API</div>
          <div className="text-xs text-slate-400 mt-0.5">Open API Documentation</div>
        </div>
        <nav className="p-3 space-y-5">
          {NAV_GROUPS.map((group) => (
            <div key={group.label}>
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-widest px-3 mb-1.5">
                {group.label}
              </div>
              <div className="space-y-0.5">
                {group.items.map((item) => (
                  <a key={item.id} href={`#${item.id}`} className={navLinkClass(item.id)}>
                    {item.label}
                  </a>
                ))}
              </div>
            </div>
          ))}
          <div className="border-t border-slate-200 pt-2">
            <a href={`#${TRY_IT_ID}`} className={navLinkClass(TRY_IT_ID)}>
              Try It
            </a>
          </div>
        </nav>
      </aside>

      {/* ── Content ── */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-10 py-12 space-y-20">
          <span className="sr-only" aria-live="polite">{liveMsg}</span>

          {/* ── Overview ── */}
          <section id="overview">
            <h1 className="text-2xl font-bold text-slate-900 mb-2">BIMS Open API</h1>
            <p className="text-slate-500 text-sm mb-6">
              Read-only REST API for accessing barangay population data — residents, households,
              families, barangays, and aggregate statistics.
            </p>
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 mb-6">
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                Base URL
              </div>
              <code className="text-sm text-blue-700 font-mono">
                https://&lt;your-domain&gt;/api/openapi
              </code>
            </div>
            <h2 className="text-sm font-semibold text-slate-900 mb-2">Quickstart</h2>
            <ol className="list-decimal ml-5 text-sm text-slate-600 space-y-1">
              <li>Generate an API key — Admin → Municipality → Open API.</li>
              <li>
                Authenticate using the{" "}
                <code className="text-xs bg-slate-100 px-1 py-0.5 rounded">X-API-KEY</code>{" "}
                header.
              </li>
              <li>Fetch data from any endpoint your key has scope for.</li>
            </ol>
          </section>

          {/* ── Authentication ── */}
          <section id="authentication">
            <h2 className="text-xl font-bold text-slate-900 mb-1">Authentication</h2>
            <p className="text-sm text-slate-500 mb-4">
              Two supported methods — include one per request:
            </p>
            <div className="space-y-4">
              <div>
                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                  Header (recommended)
                </div>
                <pre className="bg-slate-900 text-green-400 text-xs rounded-lg p-4 overflow-x-auto font-mono leading-relaxed">
                  <code>{`GET /api/openapi/residents\nX-API-KEY: <your_api_key>`}</code>
                </pre>
              </div>
              <div>
                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                  Query parameter
                </div>
                <pre className="bg-slate-900 text-green-400 text-xs rounded-lg p-4 overflow-x-auto font-mono leading-relaxed">
                  <code>{`GET /api/openapi/residents?api_key=<your_api_key>`}</code>
                </pre>
              </div>
            </div>
            <p className="text-xs text-slate-400 mt-4">
              Keys are municipality-scoped and read-only. Expiration and rate limits may apply per
              key.
            </p>
          </section>

          {/* ── Rate Limits ── */}
          <section id="rate-limits">
            <h2 className="text-xl font-bold text-slate-900 mb-3">Rate Limits</h2>
            <p className="text-sm text-slate-600 mb-2">
              Default limit: <strong>60 requests / minute</strong> per API key.
            </p>
            <p className="text-sm text-slate-600 mb-2">
              When the limit is exceeded the server returns{" "}
              <code className="text-xs bg-slate-100 px-1 rounded">429 Too Many Requests</code>.
              Check the{" "}
              <code className="text-xs bg-slate-100 px-1 rounded">Retry-After</code> header for
              the number of seconds to wait before retrying.
            </p>
            <p className="text-sm text-slate-600">
              Higher limits are available on request to the municipal administrator.
            </p>
          </section>

          {/* ── Scopes ── */}
          <section id="scopes">
            <h2 className="text-xl font-bold text-slate-900 mb-2">Scopes</h2>
            <p className="text-sm text-slate-500 mb-4">
              Each API key is provisioned with specific scopes. A{" "}
              <code className="text-xs bg-slate-100 px-1 rounded">403</code> response means the
              key lacks the required scope for that endpoint.
            </p>
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-2 pr-6 text-slate-700 font-semibold text-xs uppercase tracking-wider">
                    Endpoint
                  </th>
                  <th className="text-left py-2 text-slate-700 font-semibold text-xs uppercase tracking-wider">
                    Required Scope
                  </th>
                </tr>
              </thead>
              <tbody className="text-slate-600">
                {[
                  ["GET /residents", "residents.read"],
                  ["GET /households", "households.read"],
                  ["GET /families", "families.read"],
                  ["GET /barangays", "barangays.read"],
                  ["GET /statistics", "statistics.read"],
                ].map(([ep, scope]) => (
                  <tr key={scope} className="border-b border-slate-100 last:border-0">
                    <td className="py-2 pr-6 font-mono text-xs text-slate-900">{ep}</td>
                    <td className="py-2">
                      <code className="text-xs bg-slate-100 px-1.5 py-0.5 rounded text-slate-800">
                        {scope}
                      </code>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          {/* ── Error Codes ── */}
          <section id="error-codes">
            <h2 className="text-xl font-bold text-slate-900 mb-4">Error Codes</h2>
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-2 pr-6 text-slate-700 font-semibold text-xs uppercase tracking-wider">
                    Code
                  </th>
                  <th className="text-left py-2 text-slate-700 font-semibold text-xs uppercase tracking-wider">
                    Meaning
                  </th>
                </tr>
              </thead>
              <tbody className="text-slate-600">
                {[
                  ["401", "Missing or invalid API key"],
                  ["403", "Key revoked or lacks required scope"],
                  ["429", "Rate limit exceeded — check Retry-After header"],
                ].map(([code, meaning]) => (
                  <tr key={code} className="border-b border-slate-100 last:border-0">
                    <td className="py-2 pr-6 font-mono font-bold text-slate-900">{code}</td>
                    <td className="py-2">{meaning}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          {/* ── Endpoint sections ── */}
          {endpoints.map((ep) => (
            <section key={ep.id} id={`ep-${ep.id}`}>
              <div className="flex items-center gap-3 mb-3">
                <span className="bg-blue-600 text-white text-xs font-bold px-2 py-0.5 rounded">
                  GET
                </span>
                <h2 className="text-xl font-bold text-slate-900 font-mono">
                  /openapi{ep.path}
                </h2>
              </div>
              <p className="text-sm text-slate-500 mb-5">{ep.desc}</p>

              {ep.params.length > 0 && (
                <div className="mb-5">
                  <h3 className="text-sm font-semibold text-slate-700 mb-2">
                    Query Parameters
                  </h3>
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200">
                        {["Name", "Type", "Required", "Notes"].map((h) => (
                          <th
                            key={h}
                            className="text-left py-1.5 pr-4 text-slate-500 font-medium text-xs uppercase tracking-wider"
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="text-slate-600">
                      {ep.params.map((p) => (
                        <tr key={p.name} className="border-b border-slate-100 last:border-0">
                          <td className="py-1.5 pr-4 font-mono text-xs text-slate-900">
                            {p.name}
                          </td>
                          <td className="py-1.5 pr-4 text-xs">{p.type}</td>
                          <td className="py-1.5 pr-4 text-xs">{p.required ? "Yes" : "No"}</td>
                          <td className="py-1.5 text-xs text-slate-400">{p.note || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="mb-5">
                <h3 className="text-sm font-semibold text-slate-700 mb-2">Response Schema</h3>
                <pre className="bg-slate-900 text-slate-300 text-xs rounded-lg p-4 overflow-x-auto font-mono leading-relaxed">
                  <code>{json(ep.schema)}</code>
                </pre>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-slate-700 mb-2">Examples</h3>
                <Tabs defaultValue="curl">
                  <TabsList>
                    <TabsTrigger value="curl">cURL</TabsTrigger>
                    <TabsTrigger value="js">JavaScript</TabsTrigger>
                  </TabsList>
                  <TabsContent value="curl">
                    <pre className="bg-slate-900 text-green-400 text-xs rounded-lg p-4 overflow-x-auto font-mono leading-relaxed">
                      <code>{ep.sampleCurl}</code>
                    </pre>
                  </TabsContent>
                  <TabsContent value="js">
                    <pre className="bg-slate-900 text-blue-300 text-xs rounded-lg p-4 overflow-x-auto font-mono leading-relaxed">
                      <code>{ep.sampleJs}</code>
                    </pre>
                  </TabsContent>
                </Tabs>
              </div>
            </section>
          ))}

          {/* ── Try It ── */}
          <section id={TRY_IT_ID}>
            <h2 className="text-xl font-bold text-slate-900 mb-4">Try It</h2>
            <div className="rounded-lg border border-slate-200 p-5 space-y-4 bg-white">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    API Key
                  </Label>
                  <div className="flex gap-2 mt-1.5">
                    <Input
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder="Paste your API key"
                      type="password"
                      className="flex-1"
                    />
                    <Button variant="outline" onClick={saveKey} className="shrink-0 px-3">
                      {savedKeyAt ? <Check className="h-4 w-4 text-green-600" /> : "Save"}
                    </Button>
                  </div>
                </div>
                <div>
                  <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Endpoint
                  </Label>
                  <select
                    value={tryEndpoint}
                    onChange={(e) => setTryEndpoint(e.target.value)}
                    className="mt-1.5 w-full h-10 border border-input rounded-md px-3 bg-background text-sm"
                  >
                    {endpoints.map((e) => (
                      <option value={e.id} key={e.id}>
                        {`GET /openapi${e.path}`}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <div className="w-24">
                  <Label className="text-xs text-slate-600">page</Label>
                  <Input
                    className="mt-1"
                    value={tryParams.page}
                    onChange={(e) => setTryParams((s) => ({ ...s, page: e.target.value }))}
                  />
                </div>
                <div className="w-24">
                  <Label className="text-xs text-slate-600">limit</Label>
                  <Input
                    className="mt-1"
                    value={tryParams.limit}
                    onChange={(e) => setTryParams((s) => ({ ...s, limit: e.target.value }))}
                  />
                </div>
                {tryEndpoint === "residents" && (
                  <div className="flex-1 min-w-48">
                    <Label className="text-xs text-slate-600">q (resident ID)</Label>
                    <Input
                      className="mt-1"
                      value={tryParams.q}
                      onChange={(e) => setTryParams((s) => ({ ...s, q: e.target.value }))}
                      placeholder="BRGN-2025-0000001"
                    />
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3">
                <Button onClick={runTry}>Send</Button>
                {tryStatus && (
                  <span className="text-sm text-slate-500">
                    {tryStatus}
                    {retryAfter ? ` • Retry-After: ${retryAfter}s` : ""}
                  </span>
                )}
              </div>

              <div>
                <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Response
                </Label>
                <Textarea
                  className="mt-1.5 font-mono text-xs h-64 bg-slate-50"
                  value={tryResponse}
                  readOnly
                />
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
};

export default DeveloperPortal;
