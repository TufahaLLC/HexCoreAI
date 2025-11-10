"use client";

import { motion } from "motion/react";
import { useMemo } from "react";

type VelKozLaserProps = {
  size: number;
  progress: number;
  isActive: boolean;
  laserColor: string;
  rotationSpeed?: number;
};

const MIN_LASER_LENGTH = 60;
const LASER_STROKE_WIDTH = 6;
const LASER_TIP_RADIUS = 8;
const PARTICLE_RADIUS = 3;
const GLOW_STD_DEVIATION = 3;
const PARTICLE_OFFSET_1 = 0.3;
const PARTICLE_OFFSET_2 = 0.5;
const PARTICLE_OFFSET_3 = 0.7;
const PARTICLE_OFFSET_4 = 0.9;
const PARTICLE_OFFSETS = [
  PARTICLE_OFFSET_1,
  PARTICLE_OFFSET_2,
  PARTICLE_OFFSET_3,
  PARTICLE_OFFSET_4,
];
const PARTICLE_MAX_RADIUS = 5;
const PARTICLE_MIN_OPACITY = 0.2;
const PARTICLE_MAX_OPACITY = 0.6;
const LASER_TIP_MIN_SCALE = 1;
const LASER_TIP_MAX_SCALE = 1.5;
const LASER_TIP_MIN_OPACITY = 0.6;
const LASER_TIP_MAX_OPACITY = 1;
const LASER_TIP_ANIMATION_DURATION = 1;
const LASER_EXTENSION_DURATION = 0.5;
const LASER_OPACITY_DURATION = 0.3;
const ROTATION_ANIMATION_DURATION = 20;
const HEXAGON_MARGIN = 60;
const PARTICLE_ANIMATION_DURATION = 1;
const PARTICLE_DELAY_INCREMENT = 0.2;
const LASER_ROTATION_DEGREES = 360;
const GRADIENT_STOP_OFFSET_1 = 0;
const GRADIENT_STOP_OFFSET_2 = 50;
const GRADIENT_STOP_OFFSET_3 = 100;
const GRADIENT_OPACITY_1 = 1;
const GRADIENT_OPACITY_2 = 0.8;
const GRADIENT_OPACITY_3 = 0.3;
const LASER_OPACITY_ACTIVE = 1;
const LASER_OPACITY_INACTIVE = 0;
const PROGRESS_PERCENTAGE_DIVISOR = 100;

export function VelKozLaser({
  size,
  progress,
  isActive,
  laserColor,
  rotationSpeed = ROTATION_ANIMATION_DURATION,
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

  return (
    <motion.g
      animate={{
        opacity: isActive ? LASER_OPACITY_ACTIVE : LASER_OPACITY_INACTIVE,
        rotate: isActive ? LASER_ROTATION_DEGREES : 0,
      }}
      initial={{ opacity: 0 }}
      style={{ transformOrigin: `${centerX}px ${centerY}px` }}
      transition={{
        opacity: { duration: LASER_OPACITY_DURATION },
        rotate: {
          duration: rotationSpeed,
          repeat: Number.POSITIVE_INFINITY,
          ease: "linear",
        },
      }}
    >
      <defs>
        {/* Dynamic laser gradient based on agent color */}
        <linearGradient
          id={`laser-gradient-${laserColor.replace("#", "")}`}
          x1="0%"
          x2="100%"
          y1="0%"
          y2="0%"
        >
          <stop
            offset={`${GRADIENT_STOP_OFFSET_1}%`}
            stopColor={laserColor}
            stopOpacity={GRADIENT_OPACITY_1}
          />
          <stop
            offset={`${GRADIENT_STOP_OFFSET_2}%`}
            stopColor={laserColor}
            stopOpacity={GRADIENT_OPACITY_2}
          />
          <stop
            offset={`${GRADIENT_STOP_OFFSET_3}%`}
            stopColor={laserColor}
            stopOpacity={GRADIENT_OPACITY_3}
          />
        </linearGradient>

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

      {/* Main laser beam - extends as progress increases */}
      <motion.line
        animate={{
          x2: centerX + laserLength,
        }}
        filter="url(#laser-glow-main)"
        stroke={`url(#laser-gradient-${laserColor.replace("#", "")})`}
        strokeLinecap="round"
        strokeWidth={LASER_STROKE_WIDTH}
        transition={{ duration: LASER_EXTENSION_DURATION, ease: "easeOut" }}
        x1={centerX}
        x2={centerX + laserLength}
        y1={centerY}
        y2={centerY}
      />

      {/* Laser tip glow - moves with extension */}
      <motion.circle
        animate={{
          cx: centerX + laserLength,
          fill: laserColor,
          opacity: [
            LASER_TIP_MIN_OPACITY,
            LASER_TIP_MAX_OPACITY,
            LASER_TIP_MIN_OPACITY,
          ],
          scale: [
            LASER_TIP_MIN_SCALE,
            LASER_TIP_MAX_SCALE,
            LASER_TIP_MIN_SCALE,
          ],
        }}
        cx={centerX + laserLength}
        cy={centerY}
        fill={laserColor}
        filter="url(#laser-glow-main)"
        r={LASER_TIP_RADIUS}
        transition={{
          cx: { duration: LASER_EXTENSION_DURATION, ease: "easeOut" },
          fill: { duration: LASER_OPACITY_DURATION },
          opacity: {
            duration: LASER_TIP_ANIMATION_DURATION,
            repeat: Number.POSITIVE_INFINITY,
            ease: "easeInOut",
          },
          scale: {
            duration: LASER_TIP_ANIMATION_DURATION,
            repeat: Number.POSITIVE_INFINITY,
            ease: "easeInOut",
          },
        }}
      />

      {/* Energy particles along laser path */}
      {PARTICLE_OFFSETS.map((offset, i) => (
        <motion.circle
          animate={{
            cx: centerX + laserLength * offset,
            opacity: [
              PARTICLE_MAX_OPACITY,
              PARTICLE_MIN_OPACITY,
              PARTICLE_MAX_OPACITY,
            ],
            r: [PARTICLE_RADIUS, PARTICLE_MAX_RADIUS, PARTICLE_RADIUS],
          }}
          cx={centerX + laserLength * offset}
          cy={centerY}
          fill={laserColor}
          key={`particle-${offset}`}
          opacity={PARTICLE_MAX_OPACITY}
          r={PARTICLE_RADIUS}
          transition={{
            cx: { duration: LASER_EXTENSION_DURATION, ease: "easeOut" },
            opacity: {
              duration: PARTICLE_ANIMATION_DURATION,
              repeat: Number.POSITIVE_INFINITY,
              delay: i * PARTICLE_DELAY_INCREMENT,
            },
            r: {
              duration: PARTICLE_ANIMATION_DURATION,
              repeat: Number.POSITIVE_INFINITY,
              delay: i * PARTICLE_DELAY_INCREMENT,
            },
          }}
        />
      ))}
    </motion.g>
  );
}
