// Sakura Camera Japanese — Supabase Edge Function v1.0
// Gemini-only multimodal image understanding. No image is persisted by this function.

const ALLOWED_ORIGINS = new Set([
  "https://chachinn.github.io",
  "http://localhost:3000",
  "http://localhost:5173",
  "http://127.0.0.1:5500",
]);
const GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/interactions";
const PRIMARY_MODEL = "gemini-3.7-flash";
const FALLBACK_MODEL = "gemini-3.6-flash";
const MAX_BASE64_CHARS = 9_000_000;
const PROVIDER_TIMEOUT_MS = 40000;

const SYSTEM_INSTRUCTION = `
You are Sakura Camera Japanese, a practical Japanese-reading assistant for travelers and learners.
Analyze only clearly visible text in the supplied image. Focus on Japanese language and travel-relevant instructions.

Rules:
- Never identify or describe people. Ignore faces and personal identity.
- Never invent unreadable or hidden text. If something is unclear, omit it or say it is unclear.
- Preserve visible prices, dates, times, platform numbers, seat numbers, percentages, quantities, and other numbers exactly.
- Translate naturally into concise English without losing restrictions or conditions.
- For menus, prioritize item names, key descriptions, prices, allergens/warnings when clearly visible, and ordering conditions.
- For signs/notices/tickets, prioritize what the user needs to do, where to go, timing, prohibitions, and warnings.
- For products, prioritize product name, purpose, directions, warnings, and important labels.
- key_text should contain the most useful Japanese visible in the image, maximum 12 items.
- kana should be a reading of the Japanese when confidently known. romaji should be standard Hepburn-style romaji.
- If there is no readable Japanese, say so plainly in headline/translation and return an empty key_text array.
- Do not infer medical, legal, or safety facts beyond the visible text.
- Return JSON only matching the supplied schema.
`;

const textField = { type: "string" };
const responseSchema = {
  type: "object",
  properties: {
    category: textField,
    detected_language: textField,
    headline: textField,
    translation: textField,
    action_needed: textField,
    confidence: textField,
    key_text: {
      type: "array",
      items: {
        type: "object",
        properties: { japanese:textField, kana:textField, romaji:textField, english:textField },
        required: ["japanese","kana","romaji","english"],
      },
    },
    warnings: { type: "array", items: textField },
  },
  required: ["category","detected_language","headline","translation","action_needed","confidence","key_text","warnings"],
};

function corsHeaders(origin: string | null) {
  return {
    "Access-Control-Allow-Origin": origin && ALLOWED_ORIGINS.has(origin) ? origin : "https://chachinn.github.io",
    "Access-Control-Allow-Headers": "content-type, apikey, x-client-info",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  };
}
function json(body: unknown, status: number, origin: string | null) {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders(origin) });
}
function publishableKey() {
  try { return JSON.parse(Deno.env.get("SUPABASE_PUBLISHABLE_KEYS") || "{}").default || ""; }
  catch { return ""; }
}
function isAuthorized(req: Request) {
  const expected = publishableKey();
  return Boolean(expected) && req.headers.get("apikey") === expected;
}
function cleanModel(value: string | undefined, fallback: string) {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, 80) || fallback;
}
function extractInteractionText(payload: any) {
  if (typeof payload?.output_text === "string" && payload.output_text.trim()) return payload.output_text;
  const steps = Array.isArray(payload?.steps) ? payload.steps : [];
  for (let i = steps.length - 1; i >= 0; i--) {
    if (steps[i]?.type !== "model_output" || !Array.isArray(steps[i]?.content)) continue;
    const text = steps[i].content.filter((part: any) => part?.type === "text" && typeof part?.text === "string").map((part: any) => part.text).join("");
    if (text.trim()) return text;
  }
  return "";
}

async function callGemini(apiKey: string, model: string, imageBase64: string, mimeType: string, context: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), PROVIDER_TIMEOUT_MS);
  try {
    const response = await fetch(GEMINI_URL, {
      method: "POST",
      headers: { "x-goog-api-key": apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        input: [
          { type:"image", data:imageBase64, mime_type:mimeType },
          { type:"text", text:`Read the Japanese in this travel photo. User-selected context: ${context || "auto"}. Focus on visible text and practical meaning.` },
        ],
        system_instruction: SYSTEM_INSTRUCTION,
        response_format: { type:"text", mime_type:"application/json", schema:responseSchema },
        generation_config: { thinking_level:"low", max_output_tokens:3500 },
        store: false,
      }),
      signal: controller.signal,
    });
    const body = await response.json().catch(() => ({}));
    return { response, body, model };
  } finally { clearTimeout(timeout); }
}

async function callWithFallback(apiKey: string, imageBase64: string, mimeType: string, context: string) {
  const primary = cleanModel(Deno.env.get("GEMINI_CAMERA_MODEL"), PRIMARY_MODEL);
  const fallback = cleanModel(Deno.env.get("GEMINI_CAMERA_FALLBACK_MODEL"), FALLBACK_MODEL);
  const first = await callGemini(apiKey, primary, imageBase64, mimeType, context);
  if (first.response.ok || ![404,429].includes(first.response.status) || primary === fallback) return { ...first, fallbackUsed:false, attemptedModels:[primary] };
  console.warn("Camera Japanese primary unavailable; trying fallback", primary, "->", fallback);
  const second = await callGemini(apiKey, fallback, imageBase64, mimeType, context);
  return { ...second, fallbackUsed:true, attemptedModels:[primary,fallback] };
}

Deno.serve(async req => {
  const origin = req.headers.get("origin");
  if (req.method === "OPTIONS") {
    if (!origin || !ALLOWED_ORIGINS.has(origin)) return json({ error:"Origin not allowed." }, 403, origin);
    return new Response(null, { status:204, headers:corsHeaders(origin) });
  }
  if (req.method !== "POST") return json({ error:"Method not allowed." }, 405, origin);
  if (!origin || !ALLOWED_ORIGINS.has(origin)) return json({ error:"Origin not allowed." }, 403, origin);
  if (!isAuthorized(req)) return json({ error:"Sakura camera authorization failed." }, 401, origin);

  const apiKey = Deno.env.get("GEMINI_API_KEY") || "";
  if (!apiKey) return json({ error:"Camera Japanese is not configured yet." }, 503, origin);

  let body: any;
  try { body = await req.json(); }
  catch { return json({ error:"Invalid JSON request." }, 400, origin); }

  const imageBase64 = String(body?.image_base64 || "").replace(/^data:image\/[a-z0-9.+-]+;base64,/i, "").trim();
  const mimeType = String(body?.mime_type || "image/jpeg").toLowerCase();
  const context = String(body?.context || "auto").replace(/\s+/g," ").trim().slice(0,40) || "auto";
  if (!imageBase64) return json({ error:"Choose a photo first." }, 400, origin);
  if (imageBase64.length > MAX_BASE64_CHARS) return json({ error:"That photo is too large. Choose a smaller image and try again." }, 413, origin);
  if (!["image/jpeg","image/png","image/webp"].includes(mimeType)) return json({ error:"Unsupported image format." }, 415, origin);

  try {
    const result = await callWithFallback(apiKey, imageBase64, mimeType, context);
    const { response, body:geminiBody, model, fallbackUsed, attemptedModels } = result;
    if (!response.ok) {
      console.error("Gemini Camera Japanese error", response.status, { attemptedModels, message:geminiBody?.error?.message || "provider error" });
      if (response.status === 429) return json({ error:"Camera Japanese is temporarily at capacity. Please try again in a moment.", retryable:true }, 429, origin);
      if (response.status === 401 || response.status === 403) return json({ error:"Camera Japanese provider configuration needs attention." }, 503, origin);
      return json({ error:"Sakura could not read this image right now." }, 502, origin);
    }
    const output = extractInteractionText(geminiBody);
    if (!output) return json({ error:"Gemini returned an empty image result." }, 502, origin);
    let parsed: any;
    try { parsed = JSON.parse(output); }
    catch { console.error("Camera Japanese invalid JSON response"); return json({ error:"Sakura received an invalid image result." }, 502, origin); }
    return json({ ...parsed, provider:"gemini", provider_label:fallbackUsed?"Sakura · Gemini backup":"Sakura · Gemini", model, model_fallback_used:Boolean(fallbackUsed) }, 200, origin);
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") return json({ error:"Image reading took too long. Please try again." }, 504, origin);
    console.error("Camera Japanese edge function error", error instanceof Error ? error.message : "unknown error");
    return json({ error:"Camera Japanese is temporarily unavailable." }, 500, origin);
  }
});
