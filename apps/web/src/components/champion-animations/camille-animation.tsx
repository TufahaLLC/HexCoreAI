"use client";

import { motion } from "motion/react";

type ChampionAnimationProps = {
  isActive: boolean;
  progress: number;
};

// Animation constants for Camille's economy effects
const HEART_SCALE_MIN = 1;
const HEART_SCALE_MAX = 1.2;
const HEART_OPACITY_MIN = 0.6;
const HEART_OPACITY_MAX = 1;
const HEART_ANIMATION_DURATION = 1.5;
const ANGLE_0 = 0;
const ANGLE_60 = 60;
const ANGLE_120 = 120;
const ANGLE_180 = 180;
const ANGLE_240 = 240;
const ANGLE_300 = 300;
const PRECISION_LINE_ANGLES = [
  ANGLE_0,
  ANGLE_60,
  ANGLE_120,
  ANGLE_180,
  ANGLE_240,
  ANGLE_300,
];
const LINE_WIDTH = "100px";
const LINE_HEIGHT = "2px";
const LINE_ANIMATION_DURATION = 2;
const LINE_DELAY_BASE = 0.2;
const LINE_COLOR = "#38BDF8";

export function CamilleAnimation({
  isActive,
  progress: _progress,
}: ChampionAnimationProps) {
  if (!isActive) {
    return null;
  }

  return (
    <motion.div className="pointer-events-none absolute inset-0">
      {/* Hextech heart pulse */}
      <motion.div className="-translate-x-1/2 -translate-y-1/2 absolute top-1/2 left-1/2 transform">
        <motion.svg height="60" viewBox="0 0 60 60" width="60">
          <title>Camille's Hextech heart pulse animation</title>
          <motion.path
            animate={{
              scale: [HEART_SCALE_MIN, HEART_SCALE_MAX, HEART_SCALE_MIN],
              opacity: [
                HEART_OPACITY_MIN,
                HEART_OPACITY_MAX,
                HEART_OPACITY_MIN,
              ],
            }}
            d="M30 15 L45 30 L30 45 L15 30 Z"
            fill={LINE_COLOR}
            style={{ transformOrigin: "center" }}
            transition={{
              duration: HEART_ANIMATION_DURATION,
              repeat: Number.POSITIVE_INFINITY,
            }}
          />
        </motion.svg>
      </motion.div>

      {/* Precision strike lines */}
      {PRECISION_LINE_ANGLES.map((angle) => (
        <motion.div
          animate={{
            scaleX: [0, 1, 0],
            opacity: [0, 1, 0],
          }}
          className="absolute top-1/2 left-1/2 origin-left"
          key={`camille-precision-line-${angle}-deg`}
          style={{
            width: LINE_WIDTH,
            height: LINE_HEIGHT,
            background: LINE_COLOR,
            transform: `rotate(${angle}deg)`,
          }}
          transition={{
            duration: LINE_ANIMATION_DURATION,
            delay: PRECISION_LINE_ANGLES.indexOf(angle) * LINE_DELAY_BASE,
            repeat: Number.POSITIVE_INFINITY,
          }}
        />
      ))}
    </motion.div>
  );
}
