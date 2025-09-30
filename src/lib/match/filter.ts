export type ItemPurchaseEvent = {
  timestamp: number;
  itemId: number;
  participantId?: number;
  puuid?: string;
};

export type CurrentGoldFrame = {
  timestamp: number;
  byPuuid: Record<string, number>;
};

export type TimelineSlice = {
  itemPurchases: ItemPurchaseEvent[];
  currentGoldFrames: CurrentGoldFrame[];
};

export type FilteredParticipant = {
  puuid?: string;
  championName?: string;
  item0?: number;
  item1?: number;
  item2?: number;
  item3?: number;
  item4?: number;
  item5?: number;
  item6?: number;
  itemsPurchased?: number;
  consumablesPurchased?: number;
  goldEarned?: number;
  goldSpent?: number;
};

export type FilteredMatch = {
  matchId: string;
  gameMode?: string;
  participants: FilteredParticipant[];
  timeline?: TimelineSlice;
};

function isNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function buildParticipant(source: unknown): FilteredParticipant {
  const participant = (source ?? {}) as Record<string, unknown>;
  const result: FilteredParticipant = {};

  if (typeof participant.puuid === 'string') result.puuid = participant.puuid;
  if (typeof participant.championName === 'string') result.championName = participant.championName;

  for (let i = 0; i <= 6; i += 1) {
    const key = `item${i}`;
    const value = participant[key];
    if (isNumber(value)) {
      result[key as keyof FilteredParticipant] = value as never;
    }
  }

  if (isNumber(participant.itemsPurchased)) {
    result.itemsPurchased = participant.itemsPurchased;
  }

  if (isNumber(participant.consumablesPurchased)) {
    result.consumablesPurchased = participant.consumablesPurchased;
  }

  if (isNumber(participant.goldEarned)) {
    result.goldEarned = participant.goldEarned;
  }

  if (isNumber(participant.goldSpent)) {
    result.goldSpent = participant.goldSpent;
  }

  return result;
}

export function filterMatchData(match: unknown): FilteredMatch | null {
  const container = (match ?? {}) as Record<string, unknown>;
  const metadata = (container.metadata ?? {}) as Record<string, unknown>;
  const info = (container.info ?? {}) as Record<string, unknown>;

  const matchId = typeof metadata.matchId === 'string' ? metadata.matchId : undefined;
  if (!matchId) return null;

  const participantsSource = Array.isArray(info.participants) ? info.participants : [];
  const participants = participantsSource.map((participant) => buildParticipant(participant));

  const filtered: FilteredMatch = {
    matchId,
    participants,
  };

  if (typeof info.gameMode === 'string') {
    filtered.gameMode = info.gameMode;
  }

  return filtered;
}

export function buildTimelineSlice(timeline: unknown): TimelineSlice | null {
  const root = (timeline ?? {}) as Record<string, unknown>;
  const info = (root.info ?? {}) as Record<string, unknown>;
  const frames = Array.isArray(info.frames) ? (info.frames as unknown[]) : [];

  if (!frames.length) return null;

  const itemPurchases: ItemPurchaseEvent[] = [];
  const currentGoldFrames: CurrentGoldFrame[] = [];

  for (const frame of frames) {
    const fr = (frame ?? {}) as Record<string, unknown>;
    const frameTimestamp = isNumber(fr.timestamp) ? fr.timestamp : undefined;

    const events = Array.isArray(fr.events) ? fr.events : [];
    for (const event of events) {
      const ev = (event ?? {}) as Record<string, unknown>;
      if (ev.type === 'ITEM_PURCHASED' && isNumber(ev.itemId)) {
        const timestamp = isNumber(ev.timestamp) ? ev.timestamp : frameTimestamp;
        const participantId = isNumber(ev.participantId) ? (ev.participantId as number) : undefined;
        const puuid = typeof ev.puuid === 'string' ? (ev.puuid as string) : undefined;

        itemPurchases.push({
          timestamp: timestamp ?? 0,
          itemId: ev.itemId,
          participantId,
          puuid,
        });
      }
    }

    const participantFrames = (fr.participantFrames ?? {}) as Record<string, unknown>;
    const byPuuid: Record<string, number> = {};
    for (const [, value] of Object.entries(participantFrames)) {
      const pf = (value ?? {}) as Record<string, unknown>;
      const puuid = typeof pf.puuid === 'string' ? (pf.puuid as string) : undefined;
      const currentGold = isNumber(pf.currentGold) ? pf.currentGold : undefined;
      if (puuid && currentGold !== undefined) {
        byPuuid[puuid] = currentGold;
      }
    }

    if (Object.keys(byPuuid).length && frameTimestamp !== undefined) {
      currentGoldFrames.push({ timestamp: frameTimestamp, byPuuid });
    }
  }

  if (!itemPurchases.length && !currentGoldFrames.length) {
    return null;
  }

  return {
    itemPurchases,
    currentGoldFrames,
  };
}

export function applyTimelineSlice(match: FilteredMatch, timeline: unknown): FilteredMatch {
  const slice = buildTimelineSlice(timeline);
  if (!slice) return match;
  return { ...match, timeline: slice };
}
