"use client";

import { motion } from "motion/react";

type ChampionAnimationProps = {
  isActive: boolean;
  progress: number;
};

// Animation constants for Ekko's competitive effects
const TRAIL_COUNT = 4;
const TRAIL_DISTANCE_POS = 30;
const TRAIL_DISTANCE_NEG = -30;
const TRAIL_OPACITY_1 = 0.8;
const TRAIL_OPACITY_2 = 0.4;
const TRAIL_OPACITY_3 = 0.2;
const TRAIL_OPACITY_4 = 0;
const TRAIL_ANIMATION_DURATION = 3;
const TRAIL_DELAY_BASE = 0.3;
const ZDRIVE_ROTATION = 360;
const ZDRIVE_DURATION = 4;
const ZDRIVE_RADIUS = 30;
const ZDRIVE_STROKE_WIDTH = 3;
const ZDRIVE_DASH_ARRAY = "10 5";
const ZDRIVE_LINE_LENGTH = 25;
const ZDRIVE_CENTER_X = 40;
const ZDRIVE_CENTER_Y = 40;
const EKKO_COLOR = "#14B8A6";

export function EkkoAnimation({
  isActive,
  progress: _progress,
}: ChampionAnimationProps) {
  if (!isActive) {
    return null;
  }

  return (
    <motion.div className="pointer-events-none absolute inset-0">
      {/* Time-trail afterimages */}
      {Array.from({ length: TRAIL_COUNT }, (_, trailIndex) => (
        <motion.div
          animate={{
            x: [0, TRAIL_DISTANCE_POS, TRAIL_DISTANCE_NEG, 0],
            opacity: [
              TRAIL_OPACITY_1,
              TRAIL_OPACITY_2,
              TRAIL_OPACITY_3,
              TRAIL_OPACITY_4,
            ],
          }}
          className="-translate-x-1/2 -translate-y-1/2 pointer-events-none absolute inset-0 top-1/2 left-1/2 transform"
          key={`ekko-trail-${trailIndex}-distance-${TRAIL_DISTANCE_POS}`}
          transition={{
            duration: TRAIL_ANIMATION_DURATION,
            delay: trailIndex * TRAIL_DELAY_BASE,
            repeat: Number.POSITIVE_INFINITY,
          }}
        >
          <svg height="60" viewBox="0 0 60 60" width="60">
            <title>Ekko's time-trail afterimage {trailIndex}</title>
            <circle cx="30" cy="30" fill={EKKO_COLOR} opacity="0.3" r="25" />
          </svg>
        </motion.div>
      ))}

      {/* Z-Drive spinning */}
      <motion.div
        animate={{ rotate: ZDRIVE_ROTATION }}
        className="-translate-x-1/2 -translate-y-1/2 pointer-events-none absolute inset-0 top-1/2 left-1/2 transform"
        transition={{
          duration: ZDRIVE_DURATION,
          repeat: Number.POSITIVE_INFINITY,
          ease: "linear",
        }}
      >
        <svg height="80" viewBox="0 0 80 80" width="80">
          <title>Ekko's Z-Drive spinning device</title>
          <circle
            cx={ZDRIVE_CENTER_X}
            cy={ZDRIVE_CENTER_Y}
            fill="none"
            r={ZDRIVE_RADIUS}
            stroke={EKKO_COLOR}
            strokeDasharray={ZDRIVE_DASH_ARRAY}
            strokeWidth={ZDRIVE_STROKE_WIDTH}
          />
          <line
            stroke={EKKO_COLOR}
            strokeWidth={ZDRIVE_STROKE_WIDTH}
            x1={ZDRIVE_CENTER_X}
            x2={ZDRIVE_CENTER_X}
            y1={ZDRIVE_CENTER_Y}
            y2={ZDRIVE_CENTER_Y - ZDRIVE_LINE_LENGTH}
          />
        </svg>
      </motion.div>
    </motion.div>
  );
}
