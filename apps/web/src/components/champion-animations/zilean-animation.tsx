"use client";

import { motion } from "motion/react";

type ChampionAnimationProps = {
  isActive: boolean;
  progress: number;
};

// Animation constants for Zilean's time manipulation effects
const CLOCK_SIZE = 60;
const CLOCK_ANIMATION_DURATION = 4;
const TIME_BUBBLE_SIZE = 45;
const TIME_BUBBLE_COUNT = 3;
const TIME_BUBBLE_ANIMATION_DURATION = 3;
const TIME_BUBBLE_OPACITY_PEAK = 0.6;
const TEMPORAL_RIPPLE_COUNT = 4;
const TEMPORAL_RIPPLE_MAX_SIZE = 100;
const TEMPORAL_RIPPLE_ANIMATION_DURATION = 2.5;
const HOURGLASS_PARTICLES = 8;
const PARTICLE_ANIMATION_DURATION = 2.8;
const CLOCK_OPACITY_MIN = 0.7;
const CLOCK_OPACITY_MAX = 1;
const CLOCK_OPACITY_FINAL = 0.7;
const CLOCK_CENTER_X = 40;
const CLOCK_CENTER_Y = 40;
const CLOCK_RADIUS = 35;
const CLOCK_STROKE_WIDTH = 3;
const CLOCK_COLOR = "#FFD700";
const HOUR_MARKER_COUNT = 12;
const HOUR_MARKER_ANGLE_OFFSET = 90;
const HOUR_MARKER_INNER_RADIUS = 30;
const HOUR_MARKER_STROKE_WIDTH = 2;
const HOUR_MARKER_COLOR = "#FFD700";
const CLOCK_HAND_STROKE_WIDTH = 2;
const CLOCK_HAND_COLOR = "#FFD700";
const CLOCK_HAND_ROTATION_MIN = 0;
const CLOCK_HAND_ROTATION_MAX = 360;
const CLOCK_HAND_TRANSFORM_ORIGIN = "40px 40px";
const CLOCK_HAND_HOUR_X1 = 40;
const CLOCK_HAND_HOUR_Y1 = 40;
const CLOCK_HAND_HOUR_Y2 = 15;
const CLOCK_HAND_MINUTE_STROKE_WIDTH = 3;
const CLOCK_HAND_MINUTE_COLOR = "#FFA500";
const CLOCK_HAND_MINUTE_Y2 = 20;
const TIME_BUBBLE_SCALE_MIN = 0.5;
const TIME_BUBBLE_SCALE_MAX = 1.3;
const TIME_BUBBLE_SCALE_FINAL = 0.5;
const TIME_BUBBLE_OPACITY_MIN = 0;
const TIME_BUBBLE_OPACITY_FINAL = 0;
const TIME_BUBBLE_Y_OFFSET = 20;
const TIME_BUBBLE_INITIAL_SCALE = 0.5;
const TIME_BUBBLE_INITIAL_OPACITY = 0;
const TIME_BUBBLE_TOP_BASE = 25;
const TIME_BUBBLE_TOP_INCREMENT = 20;
const TIME_BUBBLE_LEFT_BASE = 20;
const TIME_BUBBLE_LEFT_INCREMENT = 25;
const TIME_BUBBLE_DELAY_BASE = 0.8;
const TIME_BUBBLE_BORDER_WIDTH = 2;
const TIME_BUBBLE_BORDER_COLOR = "#FFD700";
const TIME_BUBBLE_BOX_SHADOW = "0 0 20px rgba(255, 215, 0, 0.6)";
const TIME_BUBBLE_GRADIENT =
  "radial-gradient(circle, rgba(255, 215, 0, 0.3) 0%, rgba(255, 165, 0, 0.1) 70%)";
const DEGREES_PER_HOUR = 30;
const DEGREES_TO_RADIANS_DIVISOR = 180;
const RADIANS_IN_DEGREE = Math.PI / DEGREES_TO_RADIANS_DIVISOR;
const CLOCK_HAND_MINUTE_DURATION_RATIO = 12;
const TEMPORAL_RIPPLE_SCALE_MIN = 0;
const TEMPORAL_RIPPLE_SCALE_MID = 1.5;
const TEMPORAL_RIPPLE_SCALE_FINAL = 0;
const TEMPORAL_RIPPLE_OPACITY_MIN = 0;
const TEMPORAL_RIPPLE_OPACITY_MID = 0.5;
const TEMPORAL_RIPPLE_OPACITY_FINAL = 0;
const TEMPORAL_RIPPLE_INITIAL_SCALE = 0;
const TEMPORAL_RIPPLE_INITIAL_OPACITY = 0;
const TEMPORAL_RIPPLE_DELAY_BASE = 0.6;
const TEMPORAL_RIPPLE_BORDER_COLOR = "#FFD700";
const TEMPORAL_RIPPLE_BOX_SHADOW = "0 0 25px rgba(255, 215, 0, 0.4)";
const HOURGLASS_PARTICLE_Y_OFFSET = 30;
const HOURGLASS_PARTICLE_OPACITY_MAX = 1;
const HOURGLASS_PARTICLE_OPACITY_MIN = 0.3;
const HOURGLASS_PARTICLE_SCALE_MAX = 1;
const HOURGLASS_PARTICLE_SCALE_MIN = 0.8;
const HOURGLASS_PARTICLE_INITIAL_Y = 0;
const HOURGLASS_PARTICLE_INITIAL_OPACITY = 1;
const HOURGLASS_PARTICLE_SIZE = 4;
const HOURGLASS_PARTICLE_TOP_BASE = 35;
const HOURGLASS_PARTICLE_TOP_OFFSET = 10;
const HOURGLASS_PARTICLE_LEFT_BASE = 45;
const HOURGLASS_PARTICLE_LEFT_INCREMENT = 5;
const HOURGLASS_PARTICLE_DELAY_BASE = 0.3;
const HOURGLASS_PARTICLE_COLOR = "#FFD700";
const HOURGLASS_PARTICLE_BOX_SHADOW = "0 0 8px rgba(255, 215, 0, 0.8)";
const POSITION_PERCENTAGE_50 = "50%";
const TRANSLATE_CENTER = "translate(-50%, -50%)";

export function ZileanAnimation({
  isActive,
  progress: _progress,
}: ChampionAnimationProps) {
  if (!isActive) {
    return null;
  }

  return (
    <motion.div className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* Central clock face */}
      <motion.svg
        className="-translate-x-1/2 -translate-y-1/2 absolute top-1/2 left-1/2 transform"
        height={CLOCK_SIZE}
        viewBox="0 0 80 80"
        width={CLOCK_SIZE}
      >
        <title>Zilean's clock animation</title>

        {/* Clock face */}
        <motion.circle
          animate={{
            opacity: [
              CLOCK_OPACITY_MIN,
              CLOCK_OPACITY_MAX,
              CLOCK_OPACITY_FINAL,
            ],
          }}
          cx={CLOCK_CENTER_X}
          cy={CLOCK_CENTER_Y}
          fill="none"
          r={CLOCK_RADIUS}
          stroke={CLOCK_COLOR}
          strokeWidth={CLOCK_STROKE_WIDTH}
          transition={{
            duration: CLOCK_ANIMATION_DURATION,
            repeat: Number.POSITIVE_INFINITY,
          }}
        />

        {/* Hour markers */}
        {Array.from({ length: HOUR_MARKER_COUNT }, (_, i) => {
          const angle =
            (i * DEGREES_PER_HOUR - HOUR_MARKER_ANGLE_OFFSET) *
            RADIANS_IN_DEGREE;
          const x1 =
            CLOCK_CENTER_X + Math.cos(angle) * HOUR_MARKER_INNER_RADIUS;
          const y1 =
            CLOCK_CENTER_Y + Math.sin(angle) * HOUR_MARKER_INNER_RADIUS;
          const x2 = CLOCK_CENTER_X + Math.cos(angle) * CLOCK_RADIUS;
          const y2 = CLOCK_CENTER_Y + Math.sin(angle) * CLOCK_RADIUS;

          return (
            <line
              key={`hour-marker-${i}-angle-${angle}`}
              stroke={HOUR_MARKER_COLOR}
              strokeWidth={HOUR_MARKER_STROKE_WIDTH}
              x1={x1}
              x2={x2}
              y1={y1}
              y2={y2}
            />
          );
        })}

        {/* Clock hands */}
        <motion.line
          animate={{
            rotate: [CLOCK_HAND_ROTATION_MIN, CLOCK_HAND_ROTATION_MAX],
          }}
          stroke={CLOCK_HAND_COLOR}
          strokeWidth={CLOCK_HAND_STROKE_WIDTH}
          style={{
            transformOrigin: CLOCK_HAND_TRANSFORM_ORIGIN,
            transition: `transform ${CLOCK_ANIMATION_DURATION}s linear infinite`,
          }}
          x1={CLOCK_HAND_HOUR_X1}
          x2={CLOCK_HAND_HOUR_X1}
          y1={CLOCK_HAND_HOUR_Y1}
          y2={CLOCK_HAND_HOUR_Y2}
        />

        <motion.line
          animate={{
            rotate: [CLOCK_HAND_ROTATION_MIN, CLOCK_HAND_ROTATION_MAX],
          }}
          stroke={CLOCK_HAND_MINUTE_COLOR}
          strokeWidth={CLOCK_HAND_MINUTE_STROKE_WIDTH}
          style={{
            transformOrigin: CLOCK_HAND_TRANSFORM_ORIGIN,
            transition: `transform ${CLOCK_ANIMATION_DURATION / CLOCK_HAND_MINUTE_DURATION_RATIO}s linear infinite`,
          }}
          x1={CLOCK_HAND_HOUR_X1}
          x2={CLOCK_HAND_HOUR_X1}
          y1={CLOCK_HAND_HOUR_Y1}
          y2={CLOCK_HAND_MINUTE_Y2}
        />
      </motion.svg>

      {/* Time bubbles */}
      {Array.from({ length: TIME_BUBBLE_COUNT }, (_, i) => (
        <motion.div
          animate={{
            scale: [
              TIME_BUBBLE_SCALE_MIN,
              TIME_BUBBLE_SCALE_MAX,
              TIME_BUBBLE_SCALE_FINAL,
            ],
            opacity: [
              TIME_BUBBLE_OPACITY_MIN,
              TIME_BUBBLE_OPACITY_PEAK,
              TIME_BUBBLE_OPACITY_FINAL,
            ],
            y: [0, -TIME_BUBBLE_Y_OFFSET, 0],
          }}
          className="absolute rounded-full"
          initial={{
            scale: TIME_BUBBLE_INITIAL_SCALE,
            opacity: TIME_BUBBLE_INITIAL_OPACITY,
          }}
          key={`zilean-time-bubble-${i}-position-${TIME_BUBBLE_TOP_BASE + i * TIME_BUBBLE_TOP_INCREMENT}-${TIME_BUBBLE_LEFT_BASE + i * TIME_BUBBLE_LEFT_INCREMENT}`}
          style={{
            width: `${TIME_BUBBLE_SIZE}px`,
            height: `${TIME_BUBBLE_SIZE}px`,
            top: `${TIME_BUBBLE_TOP_BASE + i * TIME_BUBBLE_TOP_INCREMENT}%`,
            left: `${TIME_BUBBLE_LEFT_BASE + i * TIME_BUBBLE_LEFT_INCREMENT}%`,
            background: TIME_BUBBLE_GRADIENT,
            border: `${TIME_BUBBLE_BORDER_WIDTH}px solid ${TIME_BUBBLE_BORDER_COLOR}`,
            boxShadow: TIME_BUBBLE_BOX_SHADOW,
          }}
          transition={{
            duration: TIME_BUBBLE_ANIMATION_DURATION,
            delay: i * TIME_BUBBLE_DELAY_BASE,
            repeat: Number.POSITIVE_INFINITY,
          }}
        />
      ))}

      {/* Temporal ripples */}
      {Array.from({ length: TEMPORAL_RIPPLE_COUNT }, (_, i) => (
        <motion.div
          animate={{
            scale: [
              TEMPORAL_RIPPLE_SCALE_MIN,
              TEMPORAL_RIPPLE_SCALE_MID,
              TEMPORAL_RIPPLE_SCALE_FINAL,
            ],
            opacity: [
              TEMPORAL_RIPPLE_OPACITY_MIN,
              TEMPORAL_RIPPLE_OPACITY_MID,
              TEMPORAL_RIPPLE_OPACITY_FINAL,
            ],
          }}
          className="absolute rounded-full border-2"
          initial={{
            scale: TEMPORAL_RIPPLE_INITIAL_SCALE,
            opacity: TEMPORAL_RIPPLE_INITIAL_OPACITY,
          }}
          key={`zilean-temporal-ripple-${i}-delay-${TEMPORAL_RIPPLE_DELAY_BASE * i}`}
          style={{
            width: `${TEMPORAL_RIPPLE_MAX_SIZE}px`,
            height: `${TEMPORAL_RIPPLE_MAX_SIZE}px`,
            top: POSITION_PERCENTAGE_50,
            left: POSITION_PERCENTAGE_50,
            transform: TRANSLATE_CENTER,
            borderColor: TEMPORAL_RIPPLE_BORDER_COLOR,
            boxShadow: TEMPORAL_RIPPLE_BOX_SHADOW,
          }}
          transition={{
            duration: TEMPORAL_RIPPLE_ANIMATION_DURATION,
            delay: i * TEMPORAL_RIPPLE_DELAY_BASE,
            repeat: Number.POSITIVE_INFINITY,
          }}
        />
      ))}

      {/* Hourglass particles */}
      {Array.from({ length: HOURGLASS_PARTICLES }, (_, i) => (
        <motion.div
          animate={{
            y: [
              HOURGLASS_PARTICLE_INITIAL_Y,
              HOURGLASS_PARTICLE_Y_OFFSET,
              HOURGLASS_PARTICLE_INITIAL_Y,
            ],
            opacity: [
              HOURGLASS_PARTICLE_OPACITY_MAX,
              HOURGLASS_PARTICLE_OPACITY_MIN,
              HOURGLASS_PARTICLE_OPACITY_MAX,
            ],
            scale: [
              HOURGLASS_PARTICLE_SCALE_MAX,
              HOURGLASS_PARTICLE_SCALE_MIN,
              HOURGLASS_PARTICLE_SCALE_MAX,
            ],
          }}
          className="absolute rounded-full"
          initial={{
            y: HOURGLASS_PARTICLE_INITIAL_Y,
            opacity: HOURGLASS_PARTICLE_INITIAL_OPACITY,
          }}
          key={`zilean-hourglass-particle-${i}-position-${HOURGLASS_PARTICLE_TOP_BASE + (i % 2) * HOURGLASS_PARTICLE_TOP_OFFSET}-${HOURGLASS_PARTICLE_LEFT_BASE + i * HOURGLASS_PARTICLE_LEFT_INCREMENT}`}
          style={{
            width: `${HOURGLASS_PARTICLE_SIZE}px`,
            height: `${HOURGLASS_PARTICLE_SIZE}px`,
            top: `${HOURGLASS_PARTICLE_TOP_BASE + (i % 2) * HOURGLASS_PARTICLE_TOP_OFFSET}%`,
            left: `${HOURGLASS_PARTICLE_LEFT_BASE + i * HOURGLASS_PARTICLE_LEFT_INCREMENT}%`,
            backgroundColor: HOURGLASS_PARTICLE_COLOR,
            boxShadow: HOURGLASS_PARTICLE_BOX_SHADOW,
          }}
          transition={{
            duration: PARTICLE_ANIMATION_DURATION,
            delay: i * HOURGLASS_PARTICLE_DELAY_BASE,
            repeat: Number.POSITIVE_INFINITY,
            repeatType: "reverse",
          }}
        />
      ))}
    </motion.div>
  );
}
