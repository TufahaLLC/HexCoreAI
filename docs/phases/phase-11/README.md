# Phase 11: Multi-Agent System Expansion with Third-Party API Integration

**Status:** 🔄 Pending

**Phase Duration:** Weeks 17–24 (8 weeks)

**Prerequisites:** Phase 7 completion (all existing agents operational)

## Overview

Phase 11 transforms the HexCore AI multi-agent system by integrating third-party external APIs alongside Riot's native endpoints, enabling community-driven meta analysis, advanced benchmarking, and comparative player analytics. This expansion leverages data from U.GG, OP.GG, Community Dragon, Mobalytics, LoLalytics, and Data Dragon to provide context-aware insights that go beyond raw match statistics.

**Key Enhancement Areas:**

- Meta-Aware Analysis: Real-time tier lists, optimal builds, and patch-specific recommendations
- Community Benchmarking: Percentile rankings vs global/regional player populations
- Counter-Play Intelligence: Matchup-specific strategies and adaptation recommendations
- Advanced Synergy Detection: Team composition optimization based on community data
- Temporal Meta Tracking: Patch-to-patch performance analysis and adaptation speed

## Tasks

1. [Task 11.1: Update Existing Agent Action Groups with External API Integration](./task-111-update-existing-agent-action-groups.md)
2. [Task 11.2: Define and Configure New Specialized Agents](./task-112-define-and-configure-new-specialized-agents.md)
3. [Task 11.3: Implement Action Groups for New Specialized Agents](./task-113-implement-action-groups-for-new-specialized-agents.md)
4. [Task 11.4: Implement Orchestrators for New Specialized Agents](./task-114-implement-orchestrators-for-new-specialized-agents.md)
5. [Task 11.5: Updated Riot API Client Module](./task-115-updated-riot-api-client-module.md)

## Third-Party Data Sources & Fields (Summary)

- Community Dragon: Champions, items, runes, and base stats
- Data Dragon: Official static data and images by version
- U.GG: Tier lists, builds, runes, skill orders, matchups, percentiles
- OP.GG: Matchup counters, live stats, item builds by matchup, rankings
- LoLalytics: Advanced adjusted win rates, scaling curves, pathing
- Mobalytics: GPI metrics, mastery curves, recommended focus areas

See detailed field mappings and integrations in `Task 11.5`.

## References

- Source document: `docs/Enhance phase 11 to include Specific fields from t.md`
- Phase structure conventions: `docs/phases/README.md`
