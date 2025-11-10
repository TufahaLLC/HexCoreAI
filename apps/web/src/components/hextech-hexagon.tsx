"use client";

import { motion } from "motion/react";
import { useMemo } from "react";

type HextechHexagonProps = {
  size?: number;
  progress: number;
  isActive: boolean;
  glowColor?: string;
  championActive?: string | null;
};

const DEFAULT_SIZE = 400;
const DEFAULT_GLOW_COLOR = "#32B8C6";
const HEXAGON_RADIUS_OFFSET = 20;
const HEXAGON_SIDES = 6;
const HEXAGON_DIVISOR = 6;
const ANGLE_OFFSET = Math.PI / HEXAGON_DIVISOR;
const ROTATION_DEGREES = 360;
const BACKGROUND_STROKE_WIDTH = 2;
const PROGRESS_STROKE_WIDTH = 3;
const GLOW_STD_DEVIATION = 4;
const ANIMATION_DURATION_SECONDS = 2;
const ROTATION_DURATION_SECONDS = 8;
const CENTER_DOT_RADIUS = 4;
const CHAMPION_GLOW_RADIUS_RATIO = 4;
const CHAMPION_INNER_RADIUS_RATIO = 6;
const CHAMPION_PULSE_MAX_RATIO = 5;
const PULSE_DURATION_SECONDS = 1.5;
const BACKGROUND_OPACITY_INACTIVE = 0.3;
const BACKGROUND_OPACITY_ACTIVE = 0.6;
const PROGRESS_OPACITY_INACTIVE = 0.5;
const PROGRESS_OPACITY_ACTIVE = 1.0;
const CHAMPION_GLOW_OPACITY = 0.4;
const CHAMPION_INNER_OPACITY = 0.6;
const CENTER_DOT_OPACITY = 0.8;
const GRADIENT_STOP_OFFSET_START = 0;
const GRADIENT_STOP_OFFSET_END = 100;
const STOP_OPACITY_MIN = 0.3;
const STOP_OPACITY_MAX = 0.8;
const PROGRESS_CLIP_ANIMATION_DURATION = 0.5;
const PROGRESS_PERCENTAGE_DIVISOR = 100;

// Animation timing configuration for 11-agent system
const TOTAL_AGENT_COUNT = 11;
const FULL_PROGRESS = 100;

export const ANIMATION_CONFIG = {
  // Base timing
  BASE_AGENT_DURATION: 45, // seconds per agent (reduced from 60 for overall performance)
  TOTAL_ANALYSIS_DURATION: 495, // 11 agents * 45 seconds
  SYNTHESIS_DURATION: 30, // seconds for synthesis phase

  // Transition timing
  AGENT_TRANSITION_DURATION: 2.5, // seconds between agents
  LASER_COLOR_TRANSITION_DURATION: 1.5, // seconds for color change

  // Progress calculation
  PROGRESS_PER_AGENT: FULL_PROGRESS / TOTAL_AGENT_COUNT, // ~9.09%
  DATA_FETCHING_PROGRESS: 8, // percentage for data fetching

  // Animation speeds
  HEXAGON_PULSE_SPEED: 20, // seconds per pulse cycle
  LASER_ROTATION_SPEED: 15, // seconds per rotation
} as const;

export function HextechHexagon({
  size = DEFAULT_SIZE,
  progress,
  isActive,
  glowColor = DEFAULT_GLOW_COLOR,
  championActive = null,
}: HextechHexagonProps) {
  // Generate hexagon points
  const hexagonPoints = useMemo(() => {
    const points: string[] = [];
    const centerX = size / 2;
    const centerY = size / 2;
    const radius = size / 2 - HEXAGON_RADIUS_OFFSET;

    for (let i = 0; i < HEXAGON_SIDES; i++) {
      const angle = (Math.PI / HEXAGON_SIDES) * i - ANGLE_OFFSET;
      const x = centerX + radius * Math.cos(angle);
      const y = centerY + radius * Math.sin(angle);
      points.push(`${x},${y}`);
    }

    return points.join(" ");
  }, [size]);

  return (
    <svg
      height={size}
      style={{ overflow: "visible" }}
      viewBox={`0 0 ${size} ${size}`}
      width={size}
    >
      <title>Hextech Hexagon Animation</title>
      <defs>
        {/* Hextech glow filter */}
        <filter height="200%" id="hextech-glow" width="200%" x="-50%" y="-50%">
          <feGaussianBlur
            result="coloredBlur"
            stdDeviation={GLOW_STD_DEVIATION}
          />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        {/* Animated gradient */}
        <linearGradient
          id="hextech-gradient"
          x1="0%"
          x2="100%"
          y1="0%"
          y2="100%"
        >
          <stop
            offset={`${GRADIENT_STOP_OFFSET_START}%`}
            stopColor={glowColor}
            stopOpacity={STOP_OPACITY_MAX}
          >
            <animate
              attributeName="stop-opacity"
              dur={`${ANIMATION_DURATION_SECONDS}s`}
              repeatCount="indefinite"
              values={`${STOP_OPACITY_MAX};1;${STOP_OPACITY_MAX}`}
            />
          </stop>
          <stop
            offset={`${GRADIENT_STOP_OFFSET_END}%`}
            stopColor={glowColor}
            stopOpacity={STOP_OPACITY_MIN}
          >
            <animate
              attributeName="stop-opacity"
              dur={`${ANIMATION_DURATION_SECONDS}s`}
              repeatCount="indefinite"
              values={`${STOP_OPACITY_MIN};${STOP_OPACITY_MAX * 2};${STOP_OPACITY_MIN}`}
            />
          </stop>
        </linearGradient>

        {/* Clip path for progress */}
        <clipPath id="progress-clip">
          <motion.rect
            animate={{ scaleX: progress / PROGRESS_PERCENTAGE_DIVISOR }}
            height={size}
            initial={{ scaleX: 0 }}
            style={{ transformOrigin: "left center" }}
            transition={{
              duration: PROGRESS_CLIP_ANIMATION_DURATION,
              ease: "easeInOut",
            }}
            width={size}
            x="0"
            y="0"
          />
        </clipPath>
      </defs>

      {/* Background hexagon */}
      <motion.polygon
        animate={{
          opacity: isActive
            ? BACKGROUND_OPACITY_ACTIVE
            : BACKGROUND_OPACITY_INACTIVE,
        }}
        fill="none"
        opacity={BACKGROUND_OPACITY_INACTIVE}
        points={hexagonPoints}
        stroke={glowColor}
        strokeWidth={BACKGROUND_STROKE_WIDTH}
      />

      {/* Progress hexagon with gradient */}
      <motion.polygon
        animate={{
          opacity: isActive
            ? PROGRESS_OPACITY_ACTIVE
            : PROGRESS_OPACITY_INACTIVE,
          rotate: isActive ? ROTATION_DEGREES : 0,
        }}
        clipPath="url(#progress-clip)"
        fill="none"
        filter="url(#hextech-glow)"
        points={hexagonPoints}
        stroke="url(#hextech-gradient)"
        strokeWidth={PROGRESS_STROKE_WIDTH}
        transition={{
          rotate: {
            duration: ROTATION_DURATION_SECONDS,
            repeat: Number.POSITIVE_INFINITY,
            ease: "linear",
          },
        }}
      />

      {/* Champion indicator - shows when champion is active */}
      {championActive && (
        <motion.g
          animate={{ opacity: 1, scale: 1 }}
          initial={{ opacity: 0, scale: 0 }}
          transition={{
            duration: PROGRESS_CLIP_ANIMATION_DURATION,
            type: "spring",
          }}
        >
          {/* Champion glow circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            fill="none"
            opacity={CHAMPION_GLOW_OPACITY}
            r={size / CHAMPION_GLOW_RADIUS_RATIO}
            stroke={glowColor}
            strokeWidth={BACKGROUND_STROKE_WIDTH}
          />

          {/* Pulsing inner indicator */}
          <motion.circle
            animate={{
              opacity: [
                CHAMPION_INNER_OPACITY,
                CHAMPION_INNER_OPACITY / 2,
                CHAMPION_INNER_OPACITY,
              ],
              r: [
                size / CHAMPION_INNER_RADIUS_RATIO,
                size / CHAMPION_PULSE_MAX_RATIO,
                size / CHAMPION_INNER_RADIUS_RATIO,
              ],
            }}
            cx={size / 2}
            cy={size / 2}
            fill={glowColor}
            opacity={CHAMPION_INNER_OPACITY}
            r={size / CHAMPION_INNER_RADIUS_RATIO}
            transition={{
              duration: PULSE_DURATION_SECONDS,
              repeat: Number.POSITIVE_INFINITY,
            }}
          />
        </motion.g>
      )}

      {/* Center dot */}
      <circle
        cx={size / 2}
        cy={size / 2}
        fill={glowColor}
        opacity={CENTER_DOT_OPACITY}
        r={CENTER_DOT_RADIUS}
      />
    </svg>
  );
}
