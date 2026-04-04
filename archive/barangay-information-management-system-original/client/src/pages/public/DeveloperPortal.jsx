import React from "react";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { Check } from "lucide-react";

const Code = ({ children }) => (
  <pre className="bg-muted p-3 rounded text-xs overflow-x-auto"><code>{children}</code></pre>
);

const EX_BASE = typeof window !== 'undefined' ? `${window.location.origin}/api/openapi` : `https://<your-domain>/api/openapi`;

const json = (obj) => JSON.stringify(obj, null, 2);

const residentsSchema = {
  success: true,
  data: [
    {
      id: "string",
      first_name: "string",
      last_name: "string",
      middle_name: "string",
      sex: "male|female",
      civil_status: "single|married|widowed|separated",
      birthdate: "ISODate",
      email: "string|null",
      contact_number: "string|null",
      occupation: "string|null",
      resident_status: "active|inactive",
      barangay_id: 0
    }
  ],
  pagination: { page: 1, limit: 10, total: 1, pages: 1 }
};

const householdsSchema = {
  success: true,
  data: [
    {
      id: 0,
      house_number: "string|null",
      street: "string|null",
      purok_id: 0,
      barangay_id: 0,
      house_head: "resident_id",
      housing_type: "Owned|Rented|Informal",
      structure_type: "Concrete|Wood|Light|Mixed"
    }
  ],
  pagination: { page: 1, limit: 10, total: 0, pages: 0 }
};

const familiesSchema = {
  success: true,
  data: [
    {
      id: 0,
      household_id: 0,
      family_group: "string",
      family_head: "resident_id"
    }
  ],
  pagination: { page: 1, limit: 10, total: 0, pages: 0 }
};

const barangaysSchema = {
  success: true,
  data: [
    {
      id: 0,
      barangay_name: "string",
      barangay_code: "string",
      contact_number: "string",
      email: "string"
    }
  ],
  pagination: { page: 1, limit: 10, total: 0, pages: 0 }
};

const statisticsSchema = {
  success: true,
  data: {
    residents: { total: 0, male: 0, female: 0 },
    households: { total: 0 },
    families: { total: 0 }
  }
};

const endpoints = [
  {
    id: "residents",
    title: "Residents",
    path: "/residents",
    desc: "List residents (search by resident ID with q)",
    params: [
      { name: "page", type: "int", required: false },
      { name: "limit", type: "int", required: false },
      { name: "q", type: "string", required: false, note: "resident ID (partial)" }
    ],
    schema: residentsSchema,
    sampleCurl: `curl -sS "${EX_BASE}/residents?page=1&limit=10&q=BRGN-2025-0000001" \\\n  -H "X-API-KEY: <your_api_key>"`,
    sampleJs: `await fetch("${EX_BASE}/residents?page=1&limit=10&q=BRGN-2025-0000001", {\n  headers: { 'X-API-KEY': '<your_api_key>' }\n}).then(r=>r.json());`,
    samplePy: `import requests\nres = requests.get("${EX_BASE}/residents", params={"page":1,"limit":10,"q":"BRGN-2025-0000001"}, headers={"X-API-KEY":"<your_api_key>"})\ndata = res.json()`
  },
  {
    id: "households",
    title: "Households",
    path: "/households",
    desc: "List households",
    params: [
      { name: "page", type: "int", required: false },
      { name: "limit", type: "int", required: false }
    ],
    schema: householdsSchema,
    sampleCurl: `curl -sS "${EX_BASE}/households?page=1&limit=10" -H "X-API-KEY: <your_api_key>"`,
    sampleJs: `await fetch("${EX_BASE}/households?page=1&limit=10", { headers: { 'X-API-KEY': '<your_api_key>' } }).then(r=>r.json());`,
    samplePy: `import requests\nres = requests.get("${EX_BASE}/households", params={"page":1,"limit":10}, headers={"X-API-KEY":"<your_api_key>"})\ndata = res.json()`
  },
  {
    id: "families",
    title: "Families",
    path: "/families",
    desc: "List families",
    params: [
      { name: "page", type: "int", required: false },
      { name: "limit", type: "int", required: false }
    ],
    schema: familiesSchema,
    sampleCurl: `curl -sS "${EX_BASE}/families?page=1&limit=10" -H "X-API-KEY: <your_api_key>"`,
    sampleJs: `await fetch("${EX_BASE}/families?page=1&limit=10", { headers: { 'X-API-KEY': '<your_api_key>' } }).then(r=>r.json());`,
    samplePy: `import requests\nres = requests.get("${EX_BASE}/families", params={"page":1,"limit":10}, headers={"X-API-KEY":"<your_api_key>"})\ndata = res.json()`
  },
  {
    id: "barangays",
    title: "Barangays",
    path: "/barangays",
    desc: "List barangays",
    params: [
      { name: "page", type: "int", required: false },
      { name: "limit", type: "int", required: false }
    ],
    schema: barangaysSchema,
    sampleCurl: `curl -sS "${EX_BASE}/barangays?page=1&limit=10" -H "X-API-KEY: <your_api_key>"`,
    sampleJs: `await fetch("${EX_BASE}/barangays?page=1&limit=10", { headers: { 'X-API-KEY': '<your_api_key>' } }).then(r=>r.json());`,
    samplePy: `import requests\nres = requests.get("${EX_BASE}/barangays", params={"page":1,"limit":10}, headers={"X-API-KEY":"<your_api_key>"})\ndata = res.json()`
  },
  {
    id: "statistics",
    title: "Statistics",
    path: "/statistics",
    desc: "Aggregate counts",
    params: [],
    schema: statisticsSchema,
    sampleCurl: `curl -sS "${EX_BASE}/statistics" -H "X-API-KEY: <your_api_key>"`,
    sampleJs: `await fetch("${EX_BASE}/statistics", { headers: { 'X-API-KEY': '<your_api_key>' } }).then(r=>r.json());`,
    samplePy: `import requests\nres = requests.get("${EX_BASE}/statistics", headers={"X-API-KEY":"<your_api_key>"})\ndata = res.json()`
  }
];

const DeveloperPortal = () => {
  const [apiKey, setApiKey] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [tryEndpoint, setTryEndpoint] = React.useState("residents");
  const [tryParams, setTryParams] = React.useState({ page: "1", limit: "10", q: "" });
  const [tryResponse, setTryResponse] = React.useState("");
  const [tryStatus, setTryStatus] = React.useState("");
  const [retryAfter, setRetryAfter] = React.useState("");
  const [savedKeyAt, setSavedKeyAt] = React.useState(0);
  const [liveMsg, setLiveMsg] = React.useState("");

  React.useEffect(() => {
    const saved = localStorage.getItem("devPortalApiKey");
    if (saved) setApiKey(saved);
  }, []);

  const { toast } = useToast();
  const saveKey = () => {
    localStorage.setItem("devPortalApiKey", apiKey);
    setSavedKeyAt(Date.now());
    setLiveMsg("API key saved for Try It requests");
    toast({ title: "API key saved", description: "Used by Try It requests", duration: 2000 });
    setTimeout(() => setSavedKeyAt(0), 1600);
  };

  const filtered = endpoints.filter(e => (e.title + e.path + e.desc).toLowerCase().includes(search.toLowerCase()));

  const runTry = async () => {
    const ep = endpoints.find(e => e.id === tryEndpoint);
    if (!ep) return;
    const url = new URL(`${EX_BASE}${ep.path}`);
    if (tryParams.page) url.searchParams.set("page", tryParams.page);
    if (tryParams.limit) url.searchParams.set("limit", tryParams.limit);
    if (tryEndpoint === 'residents' && tryParams.q) url.searchParams.set("q", tryParams.q);
    setTryStatus("Loading...");
    setTryResponse("");
    setRetryAfter("");
    try {
      const res = await fetch(url.toString(), { headers: { 'X-API-KEY': apiKey } });
      setTryStatus(`${res.status} ${res.statusText}`);
      const ra = res.headers.get('Retry-After');
      if (ra) setRetryAfter(ra);
      const jsonBody = await res.json().catch(() => ({}));
      setTryResponse(json(jsonBody));
    } catch (e) {
      setTryStatus(`Error: ${e.message}`);
      setTryResponse("");
    }
  };
  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <h1 className="text-3xl font-semibold">BIMS Open API</h1>
      <p className="text-muted-foreground">External developers can access read-only endpoints for residents, households, families, barangays, and comprehensive statistics using API keys provisioned by municipal HR.</p>

      <Card className="p-4">
        <h2 className="text-xl font-medium mb-2">Base URL</h2>
        <Code>{`https://<your-domain>/api`}</Code>
        <p className="text-sm text-muted-foreground mt-2">All endpoints below are prefixed with the base URL.</p>
      </Card>

      <Card className="p-4 space-y-3">
        <span className="sr-only" aria-live="polite">{liveMsg}</span>
        <h2 className="text-xl font-medium">Authentication</h2>
        <p className="text-sm">Use your API key via header or query param:</p>
        <Code>{`GET /api/openapi/residents\nX-API-KEY: <your_api_key>`}</Code>
        <Code>{`GET /api/openapi/residents\nAuthorization: Bearer <your_api_key>`}</Code>
        <Code>{`GET /api/openapi/residents?api_key=<your_api_key>`}</Code>
        <p className="text-sm text-muted-foreground">Keys are municipality-scoped, read-only, and may have expirations and rate limits.</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
          <div className="md:col-span-2">
            <Label htmlFor="apikey">API Key</Label>
            <Input id="apikey" value={apiKey} onChange={e=>setApiKey(e.target.value)} placeholder="Paste your API key" />
          </div>
          <div className="flex items-end">
            <Button onClick={saveKey} className="w-full">
              {savedKeyAt ? (<span className="inline-flex items-center gap-1"><Check className="h-4 w-4" />Saved</span>) : 'Save for Try It'}
            </Button>
          </div>
        </div>
      </Card>

      <Card className="p-4 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xl font-medium">Endpoints</h2>
          <Input placeholder="Search endpoints, params, fields" value={search} onChange={e=>setSearch(e.target.value)} className="max-w-sm" />
        </div>
        <Separator />
        <Accordion type="multiple" className="space-y-2">
          {filtered.map(ep => (
            <AccordionItem key={ep.id} value={ep.id}>
              <AccordionTrigger>
                <div className="text-left">
                  <div className="font-medium">GET /openapi{ep.path}</div>
                  <div className="text-xs text-muted-foreground">{ep.desc}</div>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-3">
                  <div>
                    <div className="text-sm font-medium mb-1">Query Parameters</div>
                    <ul className="text-xs grid gap-1">
                      {ep.params.length === 0 && <li className="text-muted-foreground">None</li>}
                      {ep.params.map(p => (
                        <li key={p.name}><code>{p.name}</code> ({p.type}) {p.required ? '(required)' : '(optional)'} {p.note ? `— ${p.note}` : ''}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <div className="text-sm font-medium mb-1">Response Schema</div>
                    <Code>{json(ep.schema)}</Code>
                  </div>
                  <div>
                    <div className="text-sm font-medium mb-2">Examples</div>
                    <Tabs defaultValue="curl">
                      <TabsList>
                        <TabsTrigger value="curl">cURL</TabsTrigger>
                        <TabsTrigger value="js">JavaScript</TabsTrigger>
                        <TabsTrigger value="py">Python</TabsTrigger>
                      </TabsList>
                      <TabsContent value="curl"><Code>{ep.sampleCurl}</Code></TabsContent>
                      <TabsContent value="js"><Code>{ep.sampleJs}</Code></TabsContent>
                      <TabsContent value="py"><Code>{ep.samplePy}</Code></TabsContent>
                    </Tabs>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </Card>

      <Card className="p-4 space-y-3">
        <h2 className="text-xl font-medium">Try It Now</h2>
        <div className="grid md:grid-cols-3 gap-3">
          <div>
            <Label>Endpoint</Label>
            <select value={tryEndpoint} onChange={e=>setTryEndpoint(e.target.value)} className="w-full h-10 border rounded px-2 bg-background">
              {endpoints.map(e => <option value={e.id} key={e.id}>{`GET /openapi${e.path}`}</option>)}
            </select>
          </div>
          <div>
            <Label>page</Label>
            <Input value={tryParams.page} onChange={e=>setTryParams(s=>({...s,page:e.target.value}))} />
          </div>
          <div>
            <Label>limit</Label>
            <Input value={tryParams.limit} onChange={e=>setTryParams(s=>({...s,limit:e.target.value}))} />
          </div>
          {tryEndpoint === 'residents' && (
            <div className="md:col-span-3">
              <Label>q (resident ID)</Label>
              <Input value={tryParams.q} onChange={e=>setTryParams(s=>({...s,q:e.target.value}))} placeholder="BRGN-2025-0000001" />
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <Button onClick={runTry}>Send</Button>
          <div className="text-sm text-muted-foreground flex items-center">{tryStatus}{retryAfter ? ` • Retry-After: ${retryAfter}s` : ''}</div>
        </div>
        <div>
          <Label>Response</Label>
          <Textarea className="font-mono text-xs h-64" value={tryResponse} readOnly />
        </div>
      </Card>

      <Card className="p-4">
        <h2 className="text-xl font-medium mb-2">Response Contract</h2>
        <p className="text-sm text-muted-foreground">All endpoints return a standard envelope with <code>success</code>, <code>data</code>, and optional <code>pagination</code>. Errors include HTTP status and an error message.</p>
      </Card>

      <Card className="p-4 space-y-2">
        <h2 className="text-xl font-medium">Quickstart</h2>
        <ol className="list-decimal ml-5 text-sm">
          <li>Generate an API key (Admin → Municipality → Open API).</li>
          <li>Authenticate using <code>X-API-KEY: &lt;key&gt;</code>.</li>
          <li>Fetch data using the examples above.</li>
        </ol>
      </Card>

      <Card className="p-4 space-y-2">
        <h2 className="text-xl font-medium">Error Codes</h2>
        <ul className="text-sm">
          <li><b>401</b>: Missing/invalid API key</li>
          <li><b>403</b>: Key revoked or insufficient scope</li>
          <li><b>429</b>: Rate limit exceeded <span className="text-muted-foreground">(Retry-After header may be present)</span></li>
        </ul>
      </Card>

      <Card className="p-4 space-y-2">
        <h2 className="text-xl font-medium">Rate Limiting</h2>
        <p className="text-sm">Per-key limits apply. Default is 60 requests/minute. Higher limits (e.g., 1000/hour) are available by request. Monitor the <code>Retry-After</code> header when throttled.</p>
      </Card>
    </div>
  );
};

export default DeveloperPortal;
