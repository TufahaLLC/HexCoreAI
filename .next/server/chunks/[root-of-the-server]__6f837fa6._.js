module.exports = [
"[project]/.next-internal/server/app/api/matches/route/actions.js [app-rsc] (server actions loader, ecmascript)", ((__turbopack_context__, module, exports) => {

}),
"[externals]/next/dist/compiled/next-server/app-route-turbo.runtime.dev.js [external] (next/dist/compiled/next-server/app-route-turbo.runtime.dev.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/next-server/app-route-turbo.runtime.dev.js", () => require("next/dist/compiled/next-server/app-route-turbo.runtime.dev.js"));

module.exports = mod;
}),
"[externals]/next/dist/compiled/@opentelemetry/api [external] (next/dist/compiled/@opentelemetry/api, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/@opentelemetry/api", () => require("next/dist/compiled/@opentelemetry/api"));

module.exports = mod;
}),
"[externals]/next/dist/compiled/next-server/app-page-turbo.runtime.dev.js [external] (next/dist/compiled/next-server/app-page-turbo.runtime.dev.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/next-server/app-page-turbo.runtime.dev.js", () => require("next/dist/compiled/next-server/app-page-turbo.runtime.dev.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/work-unit-async-storage.external.js [external] (next/dist/server/app-render/work-unit-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/work-unit-async-storage.external.js", () => require("next/dist/server/app-render/work-unit-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/work-async-storage.external.js [external] (next/dist/server/app-render/work-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/work-async-storage.external.js", () => require("next/dist/server/app-render/work-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/shared/lib/no-fallback-error.external.js [external] (next/dist/shared/lib/no-fallback-error.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/shared/lib/no-fallback-error.external.js", () => require("next/dist/shared/lib/no-fallback-error.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/after-task-async-storage.external.js [external] (next/dist/server/app-render/after-task-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/after-task-async-storage.external.js", () => require("next/dist/server/app-render/after-task-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/action-async-storage.external.js [external] (next/dist/server/app-render/action-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/action-async-storage.external.js", () => require("next/dist/server/app-render/action-async-storage.external.js"));

module.exports = mod;
}),
"[project]/src/lib/riot/client.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "enqueueMatchesFromIds",
    ()=>enqueueMatchesFromIds,
    "getMatchDetails",
    ()=>getMatchDetails,
    "getMatchIds",
    ()=>getMatchIds,
    "getMatchTimeline",
    ()=>getMatchTimeline,
    "getPUUID",
    ()=>getPUUID
]);
const DEFAULT_REGION = 'americas';
const RIOT_ACCOUNT_BASE = 'https://americas.api.riotgames.com';
const RIOT_MATCH_BASE = {
    americas: 'https://americas.api.riotgames.com/lol/match/v5',
    europe: 'https://europe.api.riotgames.com/lol/match/v5',
    asia: 'https://asia.api.riotgames.com/lol/match/v5',
    sea: 'https://sea.api.riotgames.com/lol/match/v5'
};
const DEFAULT_MAX_RETRIES = 3;
function getApiKey() {
    const key = process.env.RIOT_API_KEY;
    if (!key || key === 'YOUR_RIOT_API_KEY_HERE') {
        throw new Error('Riot API key is not configured. Set the RIOT_API_KEY environment variable.');
    }
    return key;
}
function resolveRegion(region) {
    if (!region) return DEFAULT_REGION;
    return region;
}
async function sleep(ms) {
    return new Promise((resolve)=>{
        setTimeout(resolve, ms);
    });
}
async function riotFetch(url, options = {}, attempt = 0) {
    const apiKey = getApiKey();
    const headers = new Headers(options.headers ?? {});
    headers.set('X-Riot-Token', apiKey);
    headers.set('Accept', 'application/json');
    const res = await fetch(url, {
        ...options,
        headers,
        cache: 'no-store'
    });
    if (res.status === 429 && attempt < (options.maxRetries ?? DEFAULT_MAX_RETRIES)) {
        const retryAfterHeader = res.headers.get('retry-after');
        const retryAfter = retryAfterHeader ? Number.parseInt(retryAfterHeader, 10) * 1000 : 2 ** attempt * 1000;
        await sleep(Number.isFinite(retryAfter) ? retryAfter : 2 ** attempt * 1000);
        return riotFetch(url, options, attempt + 1);
    }
    if (!res.ok) {
        if (res.status === 404 && options.allowNotFound) {
            return null;
        }
        const message = await res.text();
        throw new Error(`Riot API request failed (${res.status} ${res.statusText}): ${message}`);
    }
    if (res.status === 204) {
        return null;
    }
    return res.json();
}
async function getPUUID(gameName, tagLine) {
    const encodedGameName = encodeURIComponent(gameName);
    const encodedTagLine = encodeURIComponent(tagLine);
    const url = `${RIOT_ACCOUNT_BASE}/riot/account/v1/accounts/by-riot-id/${encodedGameName}/${encodedTagLine}`;
    const data = await riotFetch(url);
    if (!data || typeof data.puuid !== 'string') {
        throw new Error('Unexpected response while resolving PUUID.');
    }
    return data.puuid;
}
async function getMatchIds(params) {
    const { puuid, startTime, endTime, start = 0, count = 100, region } = params;
    const resolvedRegion = resolveRegion(region);
    const base = RIOT_MATCH_BASE[resolvedRegion];
    const url = `${base}/matches/by-puuid/${encodeURIComponent(puuid)}/ids?startTime=${startTime}&endTime=${endTime}&start=${start}&count=${count}`;
    const data = await riotFetch(url);
    if (!data) return [];
    return data;
}
async function getMatchDetails(matchId, region) {
    const resolvedRegion = resolveRegion(region);
    const base = RIOT_MATCH_BASE[resolvedRegion];
    const url = `${base}/matches/${encodeURIComponent(matchId)}`;
    const data = await riotFetch(url);
    if (!data) {
        throw new Error(`Match details unavailable for ${matchId}`);
    }
    return data;
}
async function getMatchTimeline(matchId, region) {
    const resolvedRegion = resolveRegion(region);
    const base = RIOT_MATCH_BASE[resolvedRegion];
    const url = `${base}/matches/${encodeURIComponent(matchId)}/timeline`;
    return riotFetch(url, {
        allowNotFound: true
    });
}
async function enqueueMatchesFromIds(matchIds, workItemFactory) {
    const { enqueueMatchWorkItem } = await __turbopack_context__.A("[project]/src/lib/queue/sqsClient.ts [app-route] (ecmascript, async loader)");
    let enqueued = 0;
    for (const matchId of matchIds){
        const workItem = workItemFactory(matchId);
        await enqueueMatchWorkItem(workItem);
        enqueued += 1;
    }
    return enqueued;
}
}),
"[project]/src/lib/queue/sqsClient.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "clearQueue",
    ()=>clearQueue,
    "dequeueBatch",
    ()=>dequeueBatch,
    "enqueueMatchWorkItem",
    ()=>enqueueMatchWorkItem,
    "getQueueDepth",
    ()=>getQueueDepth
]);
/**
 * Temporary in-memory queue used during local development.
 * This will be replaced by a real SQS-backed implementation in a future phase.
 */ const inMemoryQueue = [];
async function enqueueMatchWorkItem(item) {
    inMemoryQueue.push(item);
}
async function dequeueBatch(limit = 10) {
    if (limit <= 0) return [];
    return inMemoryQueue.splice(0, limit);
}
function getQueueDepth() {
    return inMemoryQueue.length;
}
function clearQueue() {
    inMemoryQueue.length = 0;
}
}),
"[project]/src/app/api/matches/route.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "GET",
    ()=>GET,
    "dynamic",
    ()=>dynamic
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/server.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$riot$2f$client$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/riot/client.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$queue$2f$sqsClient$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/queue/sqsClient.ts [app-route] (ecmascript)");
;
;
;
const dynamic = 'force-dynamic';
const DEFAULT_SCHEMA_VERSION = 1;
async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const gameName = searchParams.get('gameName');
        const tagLine = searchParams.get('tagLine');
        const region = searchParams.get('region') ?? 'americas';
        if (!gameName || !tagLine) {
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: 'Missing gameName or tagLine'
            }, {
                status: 400
            });
        }
        const puuid = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$riot$2f$client$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getPUUID"])(gameName, tagLine);
        const nowSeconds = Math.floor(Date.now() / 1000);
        const oneYearSeconds = 365 * 24 * 60 * 60;
        const startTime = nowSeconds - oneYearSeconds;
        const year = new Date().getUTCFullYear();
        const matchIds = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$riot$2f$client$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getMatchIds"])({
            puuid,
            startTime,
            endTime: nowSeconds,
            region
        });
        let enqueued = 0;
        for (const matchId of matchIds){
            const workItem = {
                matchId,
                puuid,
                region,
                year,
                schemaVersion: DEFAULT_SCHEMA_VERSION
            };
            // eslint-disable-next-line no-await-in-loop
            await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$queue$2f$sqsClient$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["enqueueMatchWorkItem"])(workItem);
            enqueued += 1;
        }
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            puuid,
            matchCount: matchIds.length,
            enqueued,
            region,
            year,
            schemaVersion: DEFAULT_SCHEMA_VERSION
        }, {
            status: 200
        });
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            error: message
        }, {
            status: 500
        });
    }
}
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__6f837fa6._.js.map