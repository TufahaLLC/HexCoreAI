"use client";

import { motion } from "motion/react";

type ChampionAnimationProps = {
  isActive: boolean;
  progress: number;
};

// Animation constants for Caitlyn's vision effects
const SCOPE_OPACITY_MIN = 0.3;
const SCOPE_OPACITY_MAX = 0.7;
const SCOPE_ANIMATION_DURATION = 2;
const SCOPE_GRADIENT_RADIUS = 100;
const SCOPE_LINE_OPACITY = 0.6;
const SCOPE_LINE_WIDTH = 2;
const SCOPE_CIRCLE_RADIUS_MIN = 80;
const SCOPE_CIRCLE_RADIUS_MAX = 90;
const SCOPE_GRADIENT_STOP_0 = 0;
const SCOPE_GRADIENT_STOP_50 = 50;
const SCOPE_GRADIENT_STOP_100 = 100;
const SCOPE_GRADIENT_OPACITY_0 = 0;
const SCOPE_GRADIENT_OPACITY_30 = 0.3;

export function CaitlynAnimation({
  isActive,
  progress: _progress,
}: ChampionAnimationProps) {
  if (!isActive) {
    return null;
  }

  return (
    <motion.div className="pointer-events-none absolute inset-0">
      {/* Sniper scope overlay */}
      <motion.svg
        animate={{
          opacity: [SCOPE_OPACITY_MIN, SCOPE_OPACITY_MAX, SCOPE_OPACITY_MIN],
        }}
        className="absolute inset-0"
        height="100%"
        transition={{
          duration: SCOPE_ANIMATION_DURATION,
          repeat: Number.POSITIVE_INFINITY,
        }}
        width="100%"
      >
        <title>Caitlyn's sniper scope overlay animation</title>
        <defs>
          <radialGradient id="scope-gradient">
            <stop
              offset={`${SCOPE_GRADIENT_STOP_0}%`}
              stopColor="#8B5CF6"
              stopOpacity={SCOPE_GRADIENT_OPACITY_0}
            />
            <stop
              offset={`${SCOPE_GRADIENT_STOP_50}%`}
              stopColor="#8B5CF6"
              stopOpacity={SCOPE_GRADIENT_OPACITY_30}
            />
            <stop
              offset={`${SCOPE_GRADIENT_STOP_100}%`}
              stopColor="#8B5CF6"
              stopOpacity={SCOPE_GRADIENT_OPACITY_0}
            />
          </radialGradient>
        </defs>
        <circle
          cx="50%"
          cy="50%"
          fill="url(#scope-gradient)"
          r={SCOPE_GRADIENT_RADIUS}
        />
        <line
          opacity={SCOPE_LINE_OPACITY}
          stroke="#8B5CF6"
          strokeWidth={SCOPE_LINE_WIDTH}
          x1="50%"
          x2="50%"
          y1="0"
          y2="100%"
        />
        <line
          opacity={SCOPE_LINE_OPACITY}
          stroke="#8B5CF6"
          strokeWidth={SCOPE_LINE_WIDTH}
          x1="0"
          x2="100%"
          y1="50%"
          y2="50%"
        />
        <motion.circle
          animate={{
            r: [
              SCOPE_CIRCLE_RADIUS_MIN,
              SCOPE_CIRCLE_RADIUS_MAX,
              SCOPE_CIRCLE_RADIUS_MIN,
            ],
          }}
          cx="50%"
          cy="50%"
          fill="none"
          opacity={SCOPE_LINE_OPACITY}
          stroke="#8B5CF6"
          strokeWidth={SCOPE_LINE_WIDTH}
          transition={{
            duration: SCOPE_ANIMATION_DURATION,
            repeat: Number.POSITIVE_INFINITY,
          }}
        />
      </motion.svg>
    </motion.div>
  );
}
