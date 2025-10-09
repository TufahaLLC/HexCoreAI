# Task 3.2: Create Constants Module ✅

Define all magic numbers and constants in a centralized module for maintainability.

**Subtasks:**
- [x] Create `src/shared/constants.ts` file
- [x] Define time constants (TTL values, conversion factors)
- [x] Define date constants (year boundaries)
- [x] Define retry configuration constants
- [x] Define HTTP status code constants
- [x] Define radix constants for parsing

**src/shared/constants.ts:**
```typescript
// Time constants (in seconds)
export const THIRTY_DAYS_IN_SECONDS = 2_592_000;
export const NINETY_DAYS_IN_SECONDS = 7_776_000;
export const TWO_HOURS_IN_SECONDS = 7_200;

// Conversion factors
export const MILLISECONDS_TO_SECONDS = 1_000;

// Date constants
export const YEAR_START_MONTH = 1; // January
export const YEAR_START_DAY = 1;
export const YEAR_END_MONTH = 12; // December
export const YEAR_END_DAY = 31;

// Retry configuration
export const DEFAULT_MAX_RETRIES = 5;
export const BACKOFF_BASE_MS = 1_000;
export const BACKOFF_MULTIPLIER = 2;
export const BACKOFF_JITTER_RANGE_MS = 1_000;

// HTTP Status Codes
export const RIOT_STATUS_TOO_MANY_REQUESTS = 429;
export const RIOT_STATUS_SERVICE_UNAVAILABLE = 503;
export const RATE_LIMIT_STATUS_CODES = new Set([
  RIOT_STATUS_TOO_MANY_REQUESTS,
  RIOT_STATUS_SERVICE_UNAVAILABLE,
]);

// Number parsing
export const RADIX_DECIMAL = 10;
```
