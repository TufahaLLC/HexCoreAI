export type RiotMatchMetadata = {
  dataVersion?: string;
  matchId?: string;
  participants?: string[];
};

export type RiotParticipantDTO = {
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

export type RiotMatchInfo = {
  gameMode?: string;
  participants?: RiotParticipantDTO[];
};

export type RiotMatchDTO = {
  metadata?: RiotMatchMetadata;
  info?: RiotMatchInfo;
};

export type RiotTimelineEvent = {
  type?: string;
  timestamp?: number;
  itemId?: number;
  participantId?: number;
  puuid?: string;
};

export type RiotParticipantFrame = {
  puuid?: string;
  currentGold?: number;
};

export type RiotTimelineFrame = {
  timestamp?: number;
  events?: RiotTimelineEvent[];
  participantFrames?: Record<string, RiotParticipantFrame>;
};

export type RiotTimelineInfo = {
  frames?: RiotTimelineFrame[];
};

export type RiotTimelineDTO = {
  info?: RiotTimelineInfo;
};
