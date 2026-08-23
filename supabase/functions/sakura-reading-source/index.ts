import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const ORIGINS = new Set([
  "https://chachinn.github.io",
  "http://localhost:3000",
  "http://localhost:5173",
  "http://127.0.0.1:3000",
  "http://127.0.0.1:5173",
]);

const AOZORA_HOST = "www.aozora.gr.jp";
const DEFAULT_MAX = 1600;
const HARD_MAX = 2400;
const MIN = 300;
const INVENTORY_MIN = 320;
const INVENTORY_DEFAULT_MAX = 12000;
const INVENTORY_HARD_MAX = 16000;
const MAX_SOURCE_BYTES = 1_800_000;

function cors(origin: string | null) {
  const allow = origin && ORIGINS.has(origin) ? origin : "https://chachinn.github.io";
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Headers": "apikey, content-type",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    Vary: "Origin",
  };
}

function json(body: unknown, status = 200, origin: string | null = null, cache = true) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...cors(origin),
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": status === 200 && cache ? "public, max-age=86400" : "no-store",
    },
  });
}

function publishableKeys() {
  const raw = Deno.env.get("SUPABASE_PUBLISHABLE_KEYS") || "";
  const out = new Set<string>();
  if (!raw) return out;
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed === "string") out.add(parsed);
    else if (Array.isArray(parsed)) parsed.forEach((v) => typeof v === "string" && out.add(v));
    else if (parsed && typeof parsed === "object") {
      Object.values(parsed).forEach((v) => typeof v === "string" && out.add(v));
    }
  } catch {
    raw.split(",").map((v) => v.trim()).filter(Boolean).forEach((v) => out.add(v));
  }
  return out;
}

function validAozora(value: unknown) {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value);
    if (
      url.protocol !== "https:" ||
      url.hostname !== AOZORA_HOST ||
      !/^\/cards\/\d+\/files\/[A-Za-z0-9_\-.]+\.html$/i.test(url.pathname)
    ) return null;
    url.hash = "";
    url.search = "";
    return url;
  } catch {
    return null;
  }
}

type InventoryFamily = {
  id: "gov-jma" | "gov-env";
  publisher: string;
  termsUrl: string;
  licenseName: string;
  licenseUrl: string;
};

function inventoryFamily(url: URL): InventoryFamily | null {
  if (url.protocol !== "https:") return null;
  if (url.hostname === "www.jma.go.jp" && /^\/jma\/kishou\/know\//.test(url.pathname)) {
    return {
      id: "gov-jma",
      publisher: "気象庁",
      termsUrl: "https://www.jma.go.jp/jma/kishou/info/coment.html",
      licenseName: "Public Data License 1.0",
      licenseUrl: "https://www.digital.go.jp/resources/open_data/public_data_license_v1.0",
    };
  }
  if (
    url.hostname === "www.env.go.jp" &&
    /^\/nature\/nationalparks\/list\/[a-z0-9-]+\/spot\/(?:index\.html)?$/.test(url.pathname)
  ) {
    return {
      id: "gov-env",
      publisher: "環境省",
      termsUrl: "https://www.env.go.jp/mail.html",
      licenseName: "Public Data License 1.0",
      licenseUrl: "https://www.digital.go.jp/resources/open_data/public_data_license_v1.0",
    };
  }
  return null;
}

function validInventory(value: unknown) {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value);
    url.hash = "";
    const family = inventoryFamily(url);
    return family ? { url, family } : null;
  } catch {
    return null;
  }
}

function entities(value: string) {
  const named: Record<string, string> = {
    amp: "&",
    lt: "<",
    gt: ">",
    quot: '"',
    apos: "'",
    nbsp: " ",
  };
  return value.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (_, token: string) => {
    if (token[0] === "#") {
      const hex = token[1]?.toLowerCase() === "x";
      const num = Number.parseInt(token.slice(hex ? 2 : 1), hex ? 16 : 10);
      return Number.isFinite(num) ? String.fromCodePoint(num) : "";
    }
    return named[token.toLowerCase()] ?? `&${token};`;
  });
}

function charset(contentType: string, bytes: Uint8Array) {
  const header = contentType.match(/charset\s*=\s*([^;\s]+)/i)?.[1]?.replace(/["']/g, "").toLowerCase();
  if (header) return header;
  const prefix = new TextDecoder("ascii").decode(bytes.slice(0, 4096));
  return prefix.match(/charset\s*=\s*["']?([^"'\s/>]+)/i)?.[1]?.toLowerCase() || "utf-8";
}

function decode(bytes: Uint8Array, contentType: string) {
  const label = /shift[_-]?jis|sjis|windows-31j|ms932/i.test(charset(contentType, bytes)) ? "shift_jis" : "utf-8";
  try {
    return new TextDecoder(label).decode(bytes);
  } catch {
    return new TextDecoder("utf-8").decode(bytes);
  }
}

function aozoraMain(html: string) {
  const marker = html.search(/<div[^>]*class=["'][^"']*main_text[^"']*["'][^>]*>/i);
  if (marker < 0) return "";
  const start = html.indexOf(">", marker) + 1;
  if (start <= 0) return "";
  const tail = html.slice(start);
  const end = tail.search(/<div[^>]*class=["'][^"']*(?:bibliographical_information|notation_notes|after_text)[^"']*["'][^>]*>/i);
  return end >= 0 ? tail.slice(0, end) : tail;
}

function aozoraParagraphs(html: string) {
  const main = aozoraMain(html);
  if (!main) return [] as string[];
  return main
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<rt\b[^>]*>[\s\S]*?<\/rt>/gi, "")
    .replace(/<rp\b[^>]*>[\s\S]*?<\/rp>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(?:p|div|h\d)>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .split("\n")
    .map((line) => entities(line).replace(/[\t\r ]+/g, " ").trim())
    .filter(Boolean)
    .filter((line) => !/^(底本|入力：|校正：|青空文庫作成ファイル|［＃)/.test(line));
}

function passage(paragraphs: string[], max: number) {
  const out: string[] = [];
  let chars = 0;
  for (const paragraph of paragraphs) {
    if (chars >= max && chars >= MIN) break;
    const remain = max - chars;
    if (remain <= 0) break;
    if (paragraph.length <= remain) {
      out.push(paragraph);
      chars += paragraph.length;
      continue;
    }
    const slice = paragraph.slice(0, remain);
    const end = Math.max(slice.lastIndexOf("。"), slice.lastIndexOf("！"), slice.lastIndexOf("？"));
    const safe = end >= Math.min(remain * 0.55, remain - 1) ? slice.slice(0, end + 1) : slice;
    if (safe.trim()) out.push(safe.trim());
    chars += safe.length;
    break;
  }
  return { paragraphs: out, text: out.join("\n\n"), charCount: chars };
}

function clean(value: string) {
  return entities(
    String(value || "")
      .replace(/<br\s*\/?\s*>/gi, "\n")
      .replace(/<ruby[^>]*>([\s\S]*?)<rt[^>]*>[\s\S]*?<\/rt>([\s\S]*?)<\/ruby>/gi, "$1$2")
      .replace(/<[^>]+>/g, " "),
  ).replace(/[\t\r ]+/g, " ").replace(/ *\n+ */g, "\n").trim();
}

function jpCount(value: string) {
  return (String(value).match(/[ぁ-んァ-ヶ一-龯々〆〤]/g) || []).length;
}

const STOP = /^(ホーム|本文へ|サイトマップ|English|検索|メニュー|前へ|次へ|戻る|トップページ)$/;
const GENERIC_TITLE = /^(ホーム|トップ|一覧|目次|サイトマップ|当サイトはjavascriptを有効にしてご覧ください。)$/i;

function normalizeLine(value: string) {
  return value.normalize("NFKC").replace(/\s+/g, "").replace(/[「」『』（）()。、，．・：:;；!?！？]/g, "");
}

function uniqueLines(lines: string[]) {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const value of lines) {
    const text = value.trim();
    if (text.length < 8 || jpCount(text) < 4 || STOP.test(text)) continue;
    const key = normalizeLine(text);
    if (key.length < 6 || seen.has(key)) continue;
    seen.add(key);
    out.push(text);
  }
  return out;
}

function genericBody(html: string) {
  const stripped = html
    .replace(/<(script|style|svg|nav|header|footer|form|noscript)\b[^>]*>[\s\S]*?<\/\1>/gi, " ")
    .replace(/<img\b[^>]*>/gi, " ");
  const main = (
    stripped.match(/<(?:div|section)\b[^>]*id=["']main_content["'][^>]*>([\s\S]*?)(?:<div\b[^>]*id=["'](?:footer|page_footer)|<\/body>)/i) ||
    stripped.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i) ||
    stripped.match(/<article\b[^>]*>([\s\S]*?)<\/article>/i) ||
    stripped.match(/<div\b[^>]*(?:id|class)=["'][^"']*(?:main|contents?|article|detail)[^"']*["'][^>]*>([\s\S]*?)<\/div>/i) ||
    [, stripped]
  )[1];
  const structured = uniqueLines(
    [...main.matchAll(/<(?:h1|h2|h3|p|li|dt|dd|th|td)\b[^>]*>([\s\S]*?)<\/(?:h1|h2|h3|p|li|dt|dd|th|td)>/gi)]
      .map((match) => clean(match[1])),
  );
  let body = structured.join("\n").trim();
  if (jpCount(body) >= INVENTORY_MIN) return body;
  const fallbackHtml = main
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(?:p|div|section|article|h\d|li|dt|dd|tr|td|th|table)>/gi, "\n");
  body = uniqueLines(clean(fallbackHtml).split("\n")).join("\n").replace(/\n{3,}/g, "\n\n").trim();
  return body;
}

function titleFrom(html: string, fallback: string) {
  const raw = (html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i) || html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i) || [])[1];
  return clean(raw || fallback).replace(/\s*[|｜].*$/, "").trim() || fallback;
}

function dateFrom(html: string, body: string) {
  const probe = `${html.slice(0, 8000)}\n${body.slice(0, 1600)}`;
  const match = probe.match(/(?:更新日|公開日|datePublished|dateModified)[^\n<>]{0,160}(20\d{2})[-年\/.](\d{1,2})[-月\/.](\d{1,2})/i);
  return match ? `${match[1]}-${match[2].padStart(2, "0")}-${match[3].padStart(2, "0")}` : null;
}

async function fetchBytes(url: URL) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  try {
    const response = await fetch(url.toString(), {
      redirect: "follow",
      signal: controller.signal,
      headers: { "User-Agent": "Sakura Japanese Reading Garden/1.0 (+https://chachinn.github.io/sakura/)" },
    });
    if (!response.ok) return { error: `Source returned HTTP ${response.status}` } as const;
    const finalUrl = new URL(response.url);
    const length = Number(response.headers.get("content-length") || 0);
    if (length > MAX_SOURCE_BYTES) return { error: "Source response was too large" } as const;
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (bytes.length > MAX_SOURCE_BYTES) return { error: "Source response was too large" } as const;
    return { response, finalUrl, bytes } as const;
  } catch (error) {
    return {
      error: error instanceof DOMException && error.name === "AbortError" ? "Source request timed out" : "Source request failed",
    } as const;
  } finally {
    clearTimeout(timeout);
  }
}

async function inventoryItem(value: string, max = INVENTORY_DEFAULT_MAX) {
  const checked = validInventory(value);
  if (!checked) return { ok: false, url: value, error: "unapproved-url" } as const;
  const fetched = await fetchBytes(checked.url);
  if ("error" in fetched) return { ok: false, url: value, error: fetched.error } as const;
  const family = inventoryFamily(fetched.finalUrl);
  if (!family || family.id !== checked.family.id) {
    return { ok: false, url: value, error: "redirect-outside-approved-family" } as const;
  }
  const contentType = fetched.response.headers.get("content-type") || "";
  if (!/text\/html|application\/xhtml\+xml/i.test(contentType)) {
    return { ok: false, url: value, error: "non-html-source" } as const;
  }
  const html = decode(fetched.bytes, contentType);
  const fullBody = genericBody(html);
  const total = jpCount(fullBody);
  if (total < INVENTORY_MIN) {
    return { ok: false, url: value, error: "insufficient-source-substance", totalJapaneseCharacterCount: total } as const;
  }
  const body = fullBody.length > max ? fullBody.slice(0, max) : fullBody;
  let title = titleFrom(html, fetched.finalUrl.pathname.split("/").filter(Boolean).at(-1) || fetched.finalUrl.hostname);
  if (family.id === "gov-env" && GENERIC_TITLE.test(title)) {
    const park = fullBody.split("\n").find((line) => /国立公園$/.test(line.trim()));
    if (park) title = `${park.trim()} 見どころ`;
  }
  if (GENERIC_TITLE.test(title)) return { ok: false, url: value, error: "landing-index-page" } as const;
  const restriction = /(?:本文|記事|資料|コンテンツ).{0,40}(?:著作権者|無断転載|転載を禁|第三者が著作権)/i.test(fullBody);
  if (restriction) return { ok: false, url: value, error: "item-level-contrary-rights-signal" } as const;
  const media = /写真(?:提供|撮影)|画像提供|動画提供|イラスト(?:提供|制作)|出典：地理院地図/i.test(fullBody);
  return {
    ok: true,
    sourceFamilyId: family.id,
    sourcePublisher: family.publisher,
    sourceUrl: fetched.finalUrl.toString(),
    sourceTitle: title,
    sourcePublishedDate: dateFrom(html, fullBody),
    termsUrl: family.termsUrl,
    licenseName: family.licenseName,
    licenseUrl: family.licenseUrl,
    sourceBodyExtractionStatus: "body-ready",
    sourceJapaneseSubstance: body,
    sourceTextCharacterCount: jpCount(body),
    totalJapaneseCharacterCount: total,
    truncated: body.length < fullBody.length,
    thirdPartyContentReview: {
      status: media ? "checked-third-party-assets-excluded" : "checked-no-item-level-signal",
      signals: [],
      excludedMedia: media ? ["third-party-media-credit"] : [],
      assetsBundled: false,
    },
  } as const;
}

async function serveAozora(req: Request, origin: string | null) {
  let payload: Record<string, unknown>;
  try {
    payload = await req.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400, origin, false);
  }
  const url = validAozora(payload.url);
  if (!url) return json({ error: "Only approved Aozora Bunko story HTML URLs are allowed" }, 400, origin, false);
  const requested = Number(payload.maxChars || DEFAULT_MAX);
  const max = Math.max(MIN, Math.min(HARD_MAX, Number.isFinite(requested) ? Math.round(requested) : DEFAULT_MAX));
  const fetched = await fetchBytes(url);
  if ("error" in fetched) return json({ error: fetched.error }, 502, origin, false);
  if (
    fetched.finalUrl.hostname !== AOZORA_HOST ||
    !/^\/cards\/\d+\/files\/[A-Za-z0-9_\-.]+\.html$/i.test(fetched.finalUrl.pathname)
  ) return json({ error: "Source redirected outside the approved Aozora path" }, 502, origin, false);
  const html = decode(fetched.bytes, fetched.response.headers.get("content-type") || "");
  const paragraphs = aozoraParagraphs(html);
  if (!paragraphs.length) return json({ error: "Could not extract the story text" }, 502, origin, false);
  const selected = passage(paragraphs, max);
  if (!selected.text) return json({ error: "Story passage was empty" }, 502, origin, false);
  return json({
    source: "青空文庫",
    sourceUrl: url.toString(),
    mode: "verbatim-public-domain-passage",
    paragraphs: selected.paragraphs,
    text: selected.text,
    charCount: selected.charCount,
    truncated: paragraphs.join("").length > selected.charCount,
  }, 200, origin);
}

async function serveInventory(req: Request, origin: string | null) {
  const requestUrl = new URL(req.url);
  const requested = Number(requestUrl.searchParams.get("maxChars") || INVENTORY_DEFAULT_MAX);
  const max = Math.max(
    INVENTORY_MIN,
    Math.min(INVENTORY_HARD_MAX, Number.isFinite(requested) ? Math.round(requested) : INVENTORY_DEFAULT_MAX),
  );
  const item = await inventoryItem(requestUrl.searchParams.get("url") || "", max);
  if (!item.ok) {
    return json({
      error: item.error,
      totalJapaneseCharacterCount: "totalJapaneseCharacterCount" in item ? item.totalJapaneseCharacterCount : 0,
    }, 422, origin, false);
  }
  return json(item, 200, origin, false);
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin");
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors(origin) });
  if (origin && !ORIGINS.has(origin)) return json({ error: "Origin not allowed" }, 403, origin, false);

  const requestUrl = new URL(req.url);
  const key = req.headers.get("apikey") || requestUrl.searchParams.get("apikey") || "";
  if (!key || !publishableKeys().has(key)) return json({ error: "Unauthorized" }, 401, origin, false);

  if (req.method === "POST") return serveAozora(req, origin);
  if (req.method === "GET" && requestUrl.searchParams.get("mode") === "inventory") return serveInventory(req, origin);
  return json({ error: "Method not allowed" }, 405, origin, false);
});
