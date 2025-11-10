"use client";

import { motion } from "motion/react";

type ChampionAnimationProps = {
  isActive: boolean;
  progress: number;
};

// Animation constants for Vi's combat effects
const PUNCH_DISTANCE = 20;
const SCALE_BOOST = 1.2;
const PUNCH_DURATION = 0.6;
const GAUNTLET_RADIUS_MIN = 30;
const GAUNTLET_RADIUS_MAX = 45;
const WAVE_WIDTH_MIN = 0;
const WAVE_WIDTH_MID = 200;
const WAVE_WIDTH_MAX = 300;
const WAVE_OPACITY_START = 0.8;
const WAVE_OPACITY_MID = 0.4;
const WAVE_OPACITY_END = 0;
const WAVE_DURATION = 1.5;
const WAVE_DELAY_BASE = 0.5;

export function ViAnimation({
  isActive,
  progress: _progress,
}: ChampionAnimationProps) {
  if (!isActive) {
    return null;
  }

  return (
    <motion.div className="pointer-events-none absolute inset-0">
      {/* Gauntlet punch effects */}
      <motion.div
        animate={{
          x: [-PUNCH_DISTANCE, PUNCH_DISTANCE, -PUNCH_DISTANCE],
          scale: [1, SCALE_BOOST, 1],
        }}
        className="-translate-x-1/2 -translate-y-1/2 pointer-events-none absolute inset-0 top-1/2 left-1/2 transform"
        transition={{
          duration: PUNCH_DURATION,
          repeat: Number.POSITIVE_INFINITY,
        }}
      >
        <svg height="100" viewBox="0 0 100 100" width="100">
          <title>Vi's gauntlet punch animation</title>
          <motion.circle
            animate={{
              r: [
                GAUNTLET_RADIUS_MIN,
                GAUNTLET_RADIUS_MAX,
                GAUNTLET_RADIUS_MIN,
              ],
              opacity: [1, 0, 1],
            }}
            cx="50"
            cy="50"
            fill="none"
            r={GAUNTLET_RADIUS_MIN}
            stroke="#F94B9F"
            strokeWidth="4"
            transition={{
              duration: PUNCH_DURATION,
              repeat: Number.POSITIVE_INFINITY,
            }}
          />
        </svg>
      </motion.div>

      {/* Impact waves */}
      {[0, 1, 2].map((i) => (
        <motion.div
          animate={{
            width: [WAVE_WIDTH_MIN, WAVE_WIDTH_MID, WAVE_WIDTH_MAX],
            height: [WAVE_WIDTH_MIN, WAVE_WIDTH_MID, WAVE_WIDTH_MAX],
            opacity: [WAVE_OPACITY_START, WAVE_OPACITY_MID, WAVE_OPACITY_END],
          }}
          className="-translate-x-1/2 -translate-y-1/2 pointer-events-none absolute inset-0 top-1/2 left-1/2 transform rounded-full border-4"
          key={i}
          style={{ borderColor: "#F94B9F" }}
          transition={{
            duration: WAVE_DURATION,
            delay: i * WAVE_DELAY_BASE,
            repeat: Number.POSITIVE_INFINITY,
          }}
        />
      ))}
    </motion.div>
  );
}
