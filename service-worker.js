const SHELL_CACHE_VERSION = "sakura-shell-v180";
const KANJI_CONTENT_CACHE_VERSION = "sakura-kanji-content-v7";
const TRAVEL_CONTENT_CACHE_VERSION = "sakura-travel-content-v1";
const VOCABULARY_CONTENT_CACHE_VERSION = "sakura-vocabulary-content-v8";
const READING_CONTENT_CACHE_VERSION = "sakura-reading-content-v10";
const QUIZ_CONTENT_CACHE_VERSION = "sakura-quiz-content-v4";

const APP_SHELL = [
    "./index.html",
    "./style.css?v=73",
    "./app.js?v=92",
    "./study-suite.js?v=1",
    "./reading-garden.js?v=8",
    "./features/sakura-reading-quality.js?v=4",
    "./features/sakura-reading-longform.js?v=2",
    "./features/sakura-reading-complete.js?v=1",
    "./features/sakura-fresh-random.js?v=1",
    "./features/sakura-source-practice.js?v=1",
    "./features/sakura-practice-grid-polish.js?v=1",
    "./features/sakura-travel-interpreter.js?v=3",
    "./features/sakura-bug-report.js?v=1",
    "./features/sakura-experience.js?v=3",
    "./features/sakura-ai-translator.js?v=2",
    "./features/sakura-auth.js?v=2",
    "./features/sakura-google-oauth.js?v=1",
    "./features/sakura-quiz-lab.js?v=2",
    "./features/sakura-quiz-engine.js?v=2",
    "./features/sakura-quiz-lab.css?v=4",
    "./features/sakura-quiz-mobile-polish.css?v=1",
    "./data/ai-config.js?v=9",
    "./data/vocabulary.js?v=6",
    "./data/native-japanese.js?v=2",
    "./data/slang.js?v=2",
    "./data/travel.js?v=4",
    "./data/kanji.js?v=24",
    "./data/kanji/n5.json",
    "./data/vocabulary/n5.json?v=2",
    "./data/vocabulary/n5-family-supplement.json?v=1",
    "./data/translation-phrases.json?v=1",
    "./data/practice-what-would-you-say.js?v=3",
    "./data/practice-sentence-builder.js?v=3",
    "./data/practice-one-line-many-personalities.js?v=3",
    "./data/practice-source-checked.js?v=1",
    "./data/reading/library/manifest.json?v=1",
    "./data/counters.json?v=2",
    "./data/particles.json?v=1",
    "./data/grammar.json?v=2",
    "./data/etiquette.json?v=1",
    "./avatar/sakura.png",
    "./manifest.webmanifest",
    "./icons/icon-180.png",
    "./icons/icon-192.png",
    "./icons/icon-512.png"
];

self.addEventListener(
    "install",
    event => {
        event.waitUntil(
            caches
                .open(SHELL_CACHE_VERSION)
                .then(cache => Promise.all(
                    APP_SHELL.map(async url => {
                        const response = await fetch(url, { cache:"reload" });
                        if (!response.ok) throw new Error(`Could not precache ${url} (HTTP ${response.status}).`);
                        await cache.put(url, response);
                    })
                ))
        );
    }
);

self.addEventListener("message", event => {
    if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener(
    "activate",
    event => {
        event.waitUntil(
            caches
                .keys()
                .then(
                    cacheNames =>
                        Promise.all(
                            cacheNames
                                .filter(
                                    cacheName =>
                                        cacheName !== SHELL_CACHE_VERSION &&
                                        cacheName !== KANJI_CONTENT_CACHE_VERSION &&
                                        cacheName !== TRAVEL_CONTENT_CACHE_VERSION &&
                                        cacheName !== VOCABULARY_CONTENT_CACHE_VERSION &&
                                        cacheName !== READING_CONTENT_CACHE_VERSION &&
                                        cacheName !== QUIZ_CONTENT_CACHE_VERSION
                                )
                                .map(cacheName => caches.delete(cacheName))
                        )
                )
                .then(() => self.clients.claim())
        );
    }
);

self.addEventListener(
    "fetch",
    event => {
        const request = event.request;
        if (request.method !== "GET") return;
        const requestUrl = new URL(request.url);

        if (request.mode === "navigate") {
            event.respondWith(
                fetch(request)
                    .then(response => {
                        const responseCopy = response.clone();
                        caches.open(SHELL_CACHE_VERSION).then(cache => cache.put("./index.html", responseCopy));
                        return response;
                    })
                    .catch(() => caches.match("./index.html"))
            );
            return;
        }

        if (requestUrl.origin === self.location.origin) {
            const isKanjiContent = requestUrl.pathname.includes("/data/kanji/") && requestUrl.pathname.endsWith(".json");
            const isTravelContent = requestUrl.pathname.includes("/data/travel/") && requestUrl.pathname.endsWith(".json");
            const isVocabularyContent = requestUrl.pathname.includes("/data/vocabulary/") && requestUrl.pathname.endsWith(".json");
            const isReadingContent = requestUrl.pathname.includes("/data/reading/") && requestUrl.pathname.endsWith(".json");
            const isQuizContent = requestUrl.pathname.includes("/data/quizzes/") && requestUrl.pathname.endsWith(".json");

            if (isKanjiContent || isTravelContent || isVocabularyContent || isReadingContent || isQuizContent) {
                const contentCacheName = isKanjiContent
                    ? KANJI_CONTENT_CACHE_VERSION
                    : isTravelContent
                        ? TRAVEL_CONTENT_CACHE_VERSION
                        : isVocabularyContent
                            ? VOCABULARY_CONTENT_CACHE_VERSION
                            : isReadingContent
                                ? READING_CONTENT_CACHE_VERSION
                                : QUIZ_CONTENT_CACHE_VERSION;
                event.respondWith(
                    fetch(request)
                        .then(async response => {
                            const contentCache = await caches.open(contentCacheName);
                            if (!response.ok) return (await contentCache.match(request)) || response;
                            await contentCache.put(request, response.clone());
                            return response;
                        })
                        .catch(async error => {
                            const contentCache = await caches.open(contentCacheName);
                            const cached = await contentCache.match(request);
                            if (cached) return cached;
                            throw error;
                        })
                );
                return;
            }

            const shouldBypassHttpCache =
                requestUrl.pathname.endsWith("/app.js") ||
                requestUrl.pathname.endsWith("/data/kanji.js") ||
                requestUrl.pathname.endsWith("/data/vocabulary.js") ||
                requestUrl.pathname.includes("/features/sakura-experience.") ||
                requestUrl.pathname.includes("/features/sakura-ai-translator.") ||
                requestUrl.pathname.includes("/features/sakura-auth.") ||
                requestUrl.pathname.includes("/features/sakura-google-oauth.") ||
                requestUrl.pathname.includes("/features/sakura-quiz-lab.") ||
                requestUrl.pathname.includes("/features/sakura-quiz-engine.") ||
                requestUrl.pathname.includes("/features/sakura-quiz-mobile-polish.") ||
                requestUrl.pathname.includes("/features/sakura-reading-quality.") ||
                requestUrl.pathname.includes("/features/sakura-reading-longform.") ||
                requestUrl.pathname.includes("/features/sakura-reading-complete.") ||
                requestUrl.pathname.includes("/features/sakura-fresh-random.") ||
                requestUrl.pathname.includes("/features/sakura-source-practice.") ||
                requestUrl.pathname.includes("/features/sakura-practice-grid-polish.") ||
                requestUrl.pathname.includes("/features/sakura-travel-interpreter.") ||
                requestUrl.pathname.includes("/features/sakura-trip-companion.") ||
                requestUrl.pathname.includes("/features/sakura-trip-public-default.") ||
                requestUrl.pathname.includes("/features/sakura-trip-store.") ||
                requestUrl.pathname.includes("/features/sakura-trip-core.") ||
                requestUrl.pathname.includes("/features/sakura-trip-store-upgrade.") ||
                requestUrl.pathname.includes("/features/sakura-trip-companion-ui.") ||
                requestUrl.pathname.includes("/features/sakura-trip-import-hotfix.") ||
                requestUrl.pathname.includes("/features/sakura-trip-file-import.") ||
                requestUrl.pathname.includes("/features/sakura-trip-workbook-extras.") ||
                requestUrl.pathname.includes("/features/sakura-trip-source-persistence.") ||
                requestUrl.pathname.includes("/features/sakura-trip-file-sync.") ||
                requestUrl.pathname.includes("/features/sakura-trip-management.") ||
                requestUrl.pathname.includes("/features/sakura-trip-live-tools.") ||
                requestUrl.pathname.includes("/features/sakura-trip-pinned-rail.") ||
                requestUrl.pathname.includes("/features/sakura-trip-rail-runtime-guard.") ||
                requestUrl.pathname.includes("/features/sakura-transit-rescue.") ||
                requestUrl.pathname.includes("/features/sakura-trip-transit-bridge.") ||
                requestUrl.pathname.includes("/features/sakura-trip-companion-polish.") ||
                requestUrl.pathname.includes("/features/sakura-trip-companion-stabilize-v2.") ||
                requestUrl.pathname.includes("/features/sakura-camera-japanese-v2.") ||
                requestUrl.pathname.includes("/features/sakura-camera-japanese.") ||
                requestUrl.pathname.includes("/features/sakura-bug-report.") ||
                requestUrl.pathname.endsWith("/data/practice-source-checked.js") ||
                requestUrl.pathname.endsWith("/data/ai-config.js");
            const networkRequest = shouldBypassHttpCache ? new Request(request, { cache:"no-cache" }) : request;
            event.respondWith(
                fetch(networkRequest)
                    .then(response => {
                        if (response.ok) {
                            const responseCopy = response.clone();
                            caches.open(SHELL_CACHE_VERSION).then(cache => cache.put(request, responseCopy));
                        }
                        return response;
                    })
                    .catch(() => caches.match(request))
            );
            return;
        }
    }
);
