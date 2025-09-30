import { NextResponse } from 'next/server';
import { getMatchIds, getPUUID, type RiotRegionalRoute } from '@/lib/riot/client';
import { enqueueMatchWorkItem } from '@/lib/queue/sqsClient';
import type { MatchWorkItem } from '@/types/queue';

export const dynamic = 'force-dynamic';

const DEFAULT_SCHEMA_VERSION = 1;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const gameName = searchParams.get('gameName');
    const tagLine = searchParams.get('tagLine');
    const region = (searchParams.get('region') as RiotRegionalRoute | null) ?? 'americas';

    if (!gameName || !tagLine) {
      return NextResponse.json({ error: 'Missing gameName or tagLine' }, { status: 400 });
    }

    const puuid = await getPUUID(gameName, tagLine);

    const nowSeconds = Math.floor(Date.now() / 1000);
    const oneYearSeconds = 365 * 24 * 60 * 60;
    const startTime = nowSeconds - oneYearSeconds;
    const year = new Date().getUTCFullYear();

    const matchIds = await getMatchIds({
      puuid,
      startTime,
      endTime: nowSeconds,
      region,
    });

    let enqueued = 0;
    for (const matchId of matchIds) {
      const workItem: MatchWorkItem = {
        matchId,
        puuid,
        region,
        year,
        schemaVersion: DEFAULT_SCHEMA_VERSION,
      };
      // eslint-disable-next-line no-await-in-loop
      await enqueueMatchWorkItem(workItem);
      enqueued += 1;
    }

    return NextResponse.json(
      {
        puuid,
        matchCount: matchIds.length,
        enqueued,
        region,
        year,
        schemaVersion: DEFAULT_SCHEMA_VERSION,
      },
      { status: 200 }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
