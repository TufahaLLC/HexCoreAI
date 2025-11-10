"use client";

import { motion } from "motion/react";

type ChampionAnimationProps = {
  isActive: boolean;
  progress: number;
};

// Animation constants for Jayce's build effects
const HAMMER_WIDTH = 20;
const HAMMER_HEIGHT = 40;
const HAMMER_HANDLE_WIDTH = 10;
const HAMMER_HANDLE_HEIGHT = 20;
const HAMMER_HANDLE_X = 35;
const HAMMER_HANDLE_Y = 55;
const HAMMER_X = 30;
const HAMMER_Y = 20;
const HAMMER_SCALE_MAX = 1.3;
const HAMMER_SCALE_MIN = 0.8;
const HAMMER_ANIMATION_DURATION = 2;
const BLUEPRINT_SIZE = 60;
const BLUEPRINT_COUNT = 4;
const BLUEPRINT_TOP_BASE = 20;
const BLUEPRINT_TOP_STEP = 20;
const BLUEPRINT_LEFT_BASE = 10;
const BLUEPRINT_LEFT_STEP = 15;
const BLUEPRINT_OPACITY_PEAK = 0.6;
const BLUEPRINT_SCALE_MAX = 1.2;
const BLUEPRINT_ANIMATION_DURATION = 2;
const BLUEPRINT_DELAY_BASE = 0.3;

export function JayceAnimation({
  isActive,
  progress: _progress,
}: ChampionAnimationProps) {
  if (!isActive) {
    return null;
  }

  return (
    <motion.div className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* Hammer transformation animation */}
      <motion.svg
        className="-translate-x-1/2 -translate-y-1/2 absolute top-1/2 left-1/2 transform"
        height="80"
        viewBox="0 0 80 80"
        width="80"
      >
        <title>Jayce's hammer transformation animation</title>
        <motion.rect
          animate={{
            scaleX: [1, HAMMER_SCALE_MAX, 1],
            scaleY: [1, HAMMER_SCALE_MIN, 1],
          }}
          fill="#C8AA6E"
          height={HAMMER_HEIGHT}
          style={{ transformOrigin: "center" }}
          transition={{
            duration: HAMMER_ANIMATION_DURATION,
            repeat: Number.POSITIVE_INFINITY,
          }}
          width={HAMMER_WIDTH}
          x={HAMMER_X}
          y={HAMMER_Y}
        />
        <rect
          fill="#8B7355"
          height={HAMMER_HANDLE_HEIGHT}
          width={HAMMER_HANDLE_WIDTH}
          x={HAMMER_HANDLE_X}
          y={HAMMER_HANDLE_Y}
        />
      </motion.svg>

      {/* Blueprint overlays */}
      {Array.from({ length: BLUEPRINT_COUNT }, (_, i) => (
        <motion.div
          animate={{
            opacity: [0, BLUEPRINT_OPACITY_PEAK, 0],
            scale: [0, 1, BLUEPRINT_SCALE_MAX],
          }}
          className="absolute rounded-lg border-2"
          initial={{ opacity: 0, scale: 0 }}
          key={`jayce-blueprint-${BLUEPRINT_TOP_BASE + i * BLUEPRINT_TOP_STEP}-${BLUEPRINT_LEFT_BASE + i * BLUEPRINT_LEFT_STEP}`}
          style={{
            borderColor: "#C8AA6E",
            width: `${BLUEPRINT_SIZE}px`,
            height: `${BLUEPRINT_SIZE}px`,
            top: `${BLUEPRINT_TOP_BASE + i * BLUEPRINT_TOP_STEP}%`,
            left: `${BLUEPRINT_LEFT_BASE + i * BLUEPRINT_LEFT_STEP}%`,
          }}
          transition={{
            duration: BLUEPRINT_ANIMATION_DURATION,
            delay: i * BLUEPRINT_DELAY_BASE,
            repeat: Number.POSITIVE_INFINITY,
          }}
        />
      ))}
    </motion.div>
  );
}
