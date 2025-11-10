"use client";

import { motion } from "motion/react";
import { useMemo } from "react";

type VelKozLaserProps = {
  size: number;
  progress: number;
  isActive: boolean;
  rotationSpeed?: number;
  onRotationUpdate?: (rotation: number) => void;
};

// Dark purple color for solid laser beam
const DARK_PURPLE = "#4C1D95";

const MIN_LASER_LENGTH = 60;
const LASER_STROKE_WIDTH = 6;
const GLOW_STD_DEVIATION = 3;
const LASER_EXTENSION_DURATION = 0.5;
const ROTATION_ANIMATION_DURATION = 20;
const HEXAGON_MARGIN = 60;
const LASER_ROTATION_DEGREES = 360;
const PROGRESS_PERCENTAGE_DIVISOR = 100;
const LASER_START_ANGLE = -90; // Start at top of hexagon

export function VelKozLaser({
  size,
  progress,
  isActive,
  rotationSpeed = ROTATION_ANIMATION_DURATION,
  onRotationUpdate,
}: VelKozLaserProps) {
  const centerX = size / 2;
  const centerY = size / 2;
  const maxRadius = size / 2 - HEXAGON_MARGIN;

  // Calculate laser length based on progress (extends forward as progress increases)
  const laserLength = useMemo(
    () =>
      MIN_LASER_LENGTH +
      (maxRadius - MIN_LASER_LENGTH) * (progress / PROGRESS_PERCENTAGE_DIVISOR),
    [maxRadius, progress]
  );

  // Determine if laser should rotate
  const shouldRotate = isActive;

  return (
    <motion.g
      animate={{
        rotate: shouldRotate ? LASER_ROTATION_DEGREES : LASER_START_ANGLE,
      }}
      initial={{ rotate: LASER_START_ANGLE }}
      onUpdate={(latest) => {
        if (onRotationUpdate && typeof latest.rotate === "number") {
          onRotationUpdate(latest.rotate);
        }
      }}
      style={{ transformOrigin: `${centerX}px ${centerY}px` }}
      transition={{
        rotate: {
          duration: rotationSpeed,
          repeat: shouldRotate ? Number.POSITIVE_INFINITY : 0,
          ease: "linear",
        },
      }}
    >
      <defs>
        {/* Laser glow filter */}
        <filter
          height="200%"
          id="laser-glow-main"
          width="200%"
          x="-50%"
          y="-50%"
        >
          <feGaussianBlur
            result="coloredBlur"
            stdDeviation={GLOW_STD_DEVIATION}
          />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Main laser beam - solid dark purple line */}
      <motion.line
        animate={{
          x2: centerX + laserLength,
        }}
        filter="url(#laser-glow-main)"
        stroke={DARK_PURPLE}
        strokeLinecap="round"
        strokeWidth={LASER_STROKE_WIDTH}
        transition={{ duration: LASER_EXTENSION_DURATION, ease: "easeOut" }}
        x1={centerX}
        x2={centerX + laserLength}
        y1={centerY}
        y2={centerY}
      />
    </motion.g>
  );
}
