import { describe, expect, it } from "vitest";
import {
  applyTimelineSlice,
  buildTimelineSlice,
  filterMatchData,
} from "./filter";
import type { RiotMatchDTO, RiotTimelineDTO } from "@/types/riot";

const MOCK_MATCH: RiotMatchDTO = {
  metadata: {
    matchId: "MATCH-123",
  },
  info: {
    gameMode: "CLASSIC",
    participants: [
      {
        puuid: "player-1",
        championName: "Ahri",
        item0: 1056,
        item1: 2003,
        itemsPurchased: 5,
        consumablesPurchased: 2,
        goldEarned: 12000,
        goldSpent: 11800,
      },
      {
        puuid: "player-2",
        championName: "Zed",
        item0: 6692,
        item1: 3142,
        itemsPurchased: 8,
        consumablesPurchased: 3,
        goldEarned: 13000,
        goldSpent: 12900,
      },
    ],
  },
};

const MOCK_TIMELINE: RiotTimelineDTO = {
  info: {
    frames: [
      {
        timestamp: 1000,
        events: [
          {
            type: "ITEM_PURCHASED",
            timestamp: 1005,
            itemId: 2003,
            participantId: 1,
            puuid: "player-1",
          },
        ],
        participantFrames: {
          "1": {
            puuid: "player-1",
            currentGold: 500,
          },
          "2": {
            puuid: "player-2",
            currentGold: 450,
          },
        },
      },
      {
        timestamp: 2000,
        events: [],
        participantFrames: {
          "1": {
            puuid: "player-1",
            currentGold: 900,
          },
        },
      },
    ],
  },
};

describe("filterMatchData", () => {
  it("returns filtered match with typed participants", () => {
    const filtered = filterMatchData(MOCK_MATCH);
    expect(filtered).not.toBeNull();
    expect(filtered?.matchId).toBe("MATCH-123");
    expect(filtered?.gameMode).toBe("CLASSIC");
    expect(filtered?.participants).toHaveLength(2);
    expect(filtered?.participants[0]).toMatchObject({
      puuid: "player-1",
      championName: "Ahri",
      item0: 1056,
      item1: 2003,
      goldEarned: 12000,
    });
  });

  it("returns null when matchId is missing", () => {
    const filtered = filterMatchData({ info: {} });
    expect(filtered).toBeNull();
  });
});

describe("buildTimelineSlice", () => {
  it("extracts item purchases and current gold frames", () => {
    const slice = buildTimelineSlice(MOCK_TIMELINE);
    expect(slice).not.toBeNull();
    expect(slice?.itemPurchases).toEqual([
      {
        timestamp: 1005,
        itemId: 2003,
        participantId: 1,
        puuid: "player-1",
      },
    ]);
    expect(slice?.currentGoldFrames).toEqual([
      {
        timestamp: 1000,
        byPuuid: {
          "player-1": 500,
          "player-2": 450,
        },
      },
      {
        timestamp: 2000,
        byPuuid: {
          "player-1": 900,
        },
      },
    ]);
  });

  it("returns null when there are no timeline frames", () => {
    const slice = buildTimelineSlice({ info: { frames: [] } });
    expect(slice).toBeNull();
  });
});

describe("applyTimelineSlice", () => {
  it("attaches timeline slice when available", () => {
    const filtered = filterMatchData(MOCK_MATCH);
    if (!filtered) throw new Error("Expected filtered match");
    const enhanced = applyTimelineSlice(filtered, MOCK_TIMELINE);
    expect(enhanced.timeline?.itemPurchases).toHaveLength(1);
    expect(enhanced.timeline?.currentGoldFrames).toHaveLength(2);
  });

  it("returns source match when no slice is created", () => {
    const filtered = filterMatchData(MOCK_MATCH);
    if (!filtered) throw new Error("Expected filtered match");
    const enhanced = applyTimelineSlice(filtered, { info: { frames: [] } });
    expect(enhanced).toBe(filtered);
  });
});
