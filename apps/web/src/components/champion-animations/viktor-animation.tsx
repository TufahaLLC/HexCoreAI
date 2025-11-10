"use client";

import { motion } from "motion/react";

type ChampionAnimationProps = {
  isActive: boolean;
  progress: number;
};

// Animation constants for Viktor's champion effects
const HEXAGON_RINGS = 3;
const HEXAGONS_PER_RING = 6;
const HEXAGONS_PER_RING_DIVISOR = 3;
const ANGLE_STEP = Math.PI / HEXAGONS_PER_RING_DIVISOR;
const BASE_RADIUS = 60;
const RING_RADIUS_STEP = 30;
const HEXAGON_SIZE = 20;
const HEXAGON_STROKE_WIDTH = 2;
const HEXAGON_ANIMATION_DURATION = 2;
const HEXAGON_DELAY_BASE = 0.3;
const HEXAGON_POSITION_DELAY = 0.1;
const HEXAGON_SCALE_MIN = 0.5;
const HEXAGON_SCALE_MAX = 1;
const HEXAGON_OPACITY_START = 0;
const HEXAGON_OPACITY_MID = 1;
const HEXAGON_OPACITY_END = 0;
const DEGREES_IN_PI = 180;
const VIKTOR_COLOR = "#A855F7";

export function ViktorAnimation({
  isActive,
  progress: _progress,
}: ChampionAnimationProps) {
  if (!isActive) {
    return null;
  }

  return (
    <motion.div className="pointer-events-none absolute inset-0">
      {/* Evolution hexagons */}
      {Array.from({ length: HEXAGON_RINGS }, (_, ringIndex) => (
        <motion.div
          className="-translate-x-1/2 -translate-y-1/2 pointer-events-none absolute inset-0 top-1/2 left-1/2 transform"
          key={`viktor-ring-${ringIndex}-radius-${BASE_RADIUS + ringIndex * RING_RADIUS_STEP}`}
        >
          {/* biome-ignore lint/nursery/noShadow: innerHexIndex is distinct from ringIndex */}
          {Array.from({ length: HEXAGONS_PER_RING }, (_, innerHexIndex) => {
            const hexAngle = ANGLE_STEP * innerHexIndex;
            const hexRadius = BASE_RADIUS + ringIndex * RING_RADIUS_STEP;
            return (
              <motion.div
                className="absolute"
                key={`viktor-hexagon-${ringIndex}-${innerHexIndex}-angle-${Math.round((hexAngle * DEGREES_IN_PI) / Math.PI)}`}
                style={{
                  left: `${Math.cos(hexAngle) * hexRadius}px`,
                  top: `${Math.sin(hexAngle) * hexRadius}px`,
                }}
              >
                <svg
                  height={HEXAGON_SIZE}
                  viewBox="0 0 20 20"
                  width={HEXAGON_SIZE}
                >
                  <title>
                    Viktor's evolution hexagon ring-{ringIndex}-pos-
                    {innerHexIndex}
                  </title>
                  <motion.polygon
                    animate={{
                      opacity: [
                        HEXAGON_OPACITY_START,
                        HEXAGON_OPACITY_MID,
                        HEXAGON_OPACITY_END,
                      ],
                      scale: [
                        HEXAGON_SCALE_MIN,
                        HEXAGON_SCALE_MAX,
                        HEXAGON_SCALE_MIN,
                      ],
                    }}
                    fill="none"
                    points="10,2 17,6 17,14 10,18 3,14 3,6"
                    stroke={VIKTOR_COLOR}
                    strokeWidth={HEXAGON_STROKE_WIDTH}
                    transition={{
                      duration: HEXAGON_ANIMATION_DURATION,
                      delay:
                        ringIndex * HEXAGON_DELAY_BASE +
                        innerHexIndex * HEXAGON_POSITION_DELAY,
                      repeat: Number.POSITIVE_INFINITY,
                    }}
                  />
                </svg>
              </motion.div>
            );
          })}
        </motion.div>
      ))}
    </motion.div>
  );
}
