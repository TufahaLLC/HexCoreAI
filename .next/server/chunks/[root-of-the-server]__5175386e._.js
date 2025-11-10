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
"[project]/src/app/api/matches/route.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "GET",
    ()=>GET,
    "dynamic",
    ()=>dynamic
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/server.js [app-route] (ecmascript)");
;
const dynamic = 'force-dynamic';
const RIOT_API_KEY = process.env.RIOT_API_KEY || 'YOUR_RIOT_API_KEY_HERE';
async function fetchRiotPUUID(gameName, tagLine) {
    const url = `https://americas.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}`;
    const res = await fetch(url, {
        headers: {
            'X-Riot-Token': RIOT_API_KEY
        },
        // Avoid cached account lookups
        cache: 'no-store'
    });
    if (!res.ok) throw new Error(`Failed to fetch PUUID: ${res.status} ${res.statusText}`);
    const data = await res.json();
    return data.puuid;
}
async function fetchMatchIds(puuid, startTime, endTime) {
    const url = `https://americas.api.riotgames.com/lol/match/v5/matches/by-puuid/${puuid}/ids?startTime=${startTime}&endTime=${endTime}&start=0&count=100`;
    const res = await fetch(url, {
        headers: {
            'X-Riot-Token': RIOT_API_KEY
        },
        cache: 'no-store'
    });
    if (!res.ok) throw new Error(`Failed to fetch match IDs: ${res.status} ${res.statusText}`);
    return await res.json();
}
async function fetchMatchesBatch(matchIds) {
    const batchResults = [];
    for (const id of matchIds){
        const url = `https://americas.api.riotgames.com/lol/match/v5/matches/${id}`;
        const res = await fetch(url, {
            headers: {
                'X-Riot-Token': RIOT_API_KEY
            },
            cache: 'no-store'
        });
        if (res.ok) {
            batchResults.push(await res.json());
        }
    }
    return batchResults;
}
async function fetchTimeline(matchId) {
    const url = `https://americas.api.riotgames.com/lol/match/v5/matches/${matchId}/timeline`;
    const res = await fetch(url, {
        headers: {
            'X-Riot-Token': RIOT_API_KEY
        },
        cache: 'no-store'
    });
    if (!res.ok) return null;
    return res.json();
}
function filterMatchData(match) {
    const obj = match ?? {};
    const metadata = obj.metadata ?? {};
    const info = obj.info ?? {};
    const matchId = typeof metadata.matchId === 'string' ? metadata.matchId : '';
    if (!matchId) return null;
    const gameMode = typeof info.gameMode === 'string' ? info.gameMode : undefined;
    const participantsUnknown = info.participants ?? [];
    const participants = participantsUnknown.map((p)=>{
        const pr = p ?? {};
        const fp = {
            puuid: typeof pr.puuid === 'string' ? pr.puuid : undefined,
            championName: typeof pr.championName === 'string' ? pr.championName : undefined,
            item0: typeof pr.item0 === 'number' ? pr.item0 : undefined,
            item1: typeof pr.item1 === 'number' ? pr.item1 : undefined,
            item2: typeof pr.item2 === 'number' ? pr.item2 : undefined,
            item3: typeof pr.item3 === 'number' ? pr.item3 : undefined,
            item4: typeof pr.item4 === 'number' ? pr.item4 : undefined,
            item5: typeof pr.item5 === 'number' ? pr.item5 : undefined,
            item6: typeof pr.item6 === 'number' ? pr.item6 : undefined,
            itemsPurchased: typeof pr.itemsPurchased === 'number' ? pr.itemsPurchased : undefined,
            consumablesPurchased: typeof pr.consumablesPurchased === 'number' ? pr.consumablesPurchased : undefined,
            goldEarned: typeof pr.goldEarned === 'number' ? pr.goldEarned : undefined,
            goldSpent: typeof pr.goldSpent === 'number' ? pr.goldSpent : undefined
        };
        return fp;
    });
    return {
        matchId,
        gameMode,
        participants
    };
}
async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const gameName = searchParams.get('gameName');
        const tagLine = searchParams.get('tagLine');
        const includeTimeline = searchParams.get('includeTimeline') === 'true';
        if (!gameName || !tagLine) {
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: 'Missing gameName or tagLine'
            }, {
                status: 400
            });
        }
        // 1. Get PUUID
        const puuid = await fetchRiotPUUID(gameName, tagLine);
        // 2. Calculate start and end timestamps for last year
        const now = Math.floor(Date.now() / 1000);
        const oneYearAgo = now - 365 * 24 * 60 * 60;
        // 3. Fetch all match IDs for last year
        const matchIds = await fetchMatchIds(puuid, oneYearAgo, now);
        // 4. Fetch match info in batches of 10
        let allMatches = [];
        for(let i = 0; i < matchIds.length; i += 10){
            const batch = matchIds.slice(i, i + 10);
            // eslint-disable-next-line no-await-in-loop
            const matches = await fetchMatchesBatch(batch);
            allMatches = allMatches.concat(matches);
        }
        // 5. Filter down to required fields per BuildAgent spec
        const filteredBase = [];
        for (const m of allMatches){
            const fm = filterMatchData(m);
            if (fm) filteredBase.push(fm);
        }
        // 6. Optionally augment with timeline data (item purchase events and currentGold)
        if (includeTimeline) {
            for(let i = 0; i < filteredBase.length; i += 1){
                const fm = filteredBase[i];
                // eslint-disable-next-line no-await-in-loop
                const timeline = await fetchTimeline(fm.matchId);
                if (timeline && typeof timeline === 'object') {
                    const t = timeline;
                    const info = t.info ?? {};
                    const frames = Array.isArray(info.frames) ? info.frames : [];
                    const itemPurchases = [];
                    const currentGoldFrames = [];
                    for (const f of frames){
                        const fr = f ?? {};
                        const ts = typeof fr.timestamp === 'number' ? fr.timestamp : undefined;
                        // events
                        const events = Array.isArray(fr.events) ? fr.events : [];
                        for (const e of events){
                            const ev = e ?? {};
                            if (ev.type === 'ITEM_PURCHASED' && typeof ev.itemId === 'number') {
                                itemPurchases.push({
                                    timestamp: typeof ev.timestamp === 'number' ? ev.timestamp : ts ?? 0,
                                    itemId: ev.itemId,
                                    participantId: typeof ev.participantId === 'number' ? ev.participantId : undefined,
                                    puuid: typeof ev.puuid === 'string' ? ev.puuid : undefined
                                });
                            }
                        }
                        // currentGold per frame by puuid
                        const pf = fr.participantFrames ?? {};
                        const byPuuid = {};
                        for (const key of Object.keys(pf)){
                            const entry = pf[key] ?? {};
                            const puuid = typeof entry.puuid === 'string' ? entry.puuid : undefined;
                            const cg = typeof entry.currentGold === 'number' ? entry.currentGold : undefined;
                            if (puuid && typeof cg === 'number') {
                                byPuuid[puuid] = cg;
                            }
                        }
                        if (ts !== undefined) {
                            currentGoldFrames.push({
                                timestamp: ts,
                                byPuuid
                            });
                        }
                    }
                    fm.timeline = {
                        itemPurchases,
                        currentGoldFrames
                    };
                }
            }
        }
        // 7. Return both original matches and filtered view for compatibility
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            matches: allMatches,
            filtered: filteredBase
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

//# sourceMappingURL=%5Broot-of-the-server%5D__5175386e._.js.map