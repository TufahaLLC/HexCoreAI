"use client";

import { motion } from "motion/react";

type ChampionAnimationProps = {
  isActive: boolean;
  progress: number;
};

// Animation constants for Kaisa's void burst and positioning effects
const VOID_BURST_SIZE = 50;
const VOID_BURST_COUNT = 4;
const VOID_BURST_MAX_SCALE = 1.5;
const VOID_BURST_ANIMATION_DURATION = 2;
const VOID_BURST_OPACITY_PEAK = 0.7;
const VOID_BURST_SCALE_MIN = 0;
const VOID_BURST_SCALE_FINAL = 0;
const VOID_BURST_OPACITY_MIN = 0;
const VOID_BURST_OPACITY_FINAL = 0;
const VOID_BURST_INITIAL_SCALE = 0;
const VOID_BURST_INITIAL_OPACITY = 0;
const VOID_BURST_TOP_BASE = 20;
const VOID_BURST_TOP_INCREMENT = 15;
const VOID_BURST_LEFT_BASE = 15;
const VOID_BURST_LEFT_INCREMENT = 20;
const VOID_BURST_DELAY_BASE = 0.5;
const TARGETING_RING_SIZE = 40;
const TARGETING_RING_COUNT = 3;
const TARGETING_ANIMATION_DURATION = 2.5;
const TARGETING_SCALE_MIN = 0.5;
const TARGETING_SCALE_MAX = 1.2;
const TARGETING_SCALE_FINAL = 0.5;
const TARGETING_OPACITY_MIN = 0.3;
const TARGETING_OPACITY_MAX = 0.8;
const TARGETING_OPACITY_FINAL = 0.3;
const TARGETING_ROTATION_MIN = 0;
const TARGETING_ROTATION_MID = 180;
const TARGETING_ROTATION_MAX = 360;
const TARGETING_INITIAL_SCALE = 0.5;
const TARGETING_INITIAL_OPACITY = 0.3;
const TARGETING_TOP_BASE = 35;
const TARGETING_TOP_INCREMENT = 12;
const TARGETING_LEFT_BASE = 40;
const TARGETING_LEFT_INCREMENT = 8;
const TARGETING_DELAY_BASE = 0.7;
const VOID_PARTICLE_COUNT = 12;
const VOID_PARTICLE_SIZE = 6;
const VOID_PARTICLE_ANIMATION_DURATION = 3;
const VOID_PARTICLE_SCALE_MIN = 1;
const VOID_PARTICLE_SCALE_MAX = 1.5;
const VOID_PARTICLE_SCALE_FINAL = 1;
const VOID_PARTICLE_OPACITY_MIN = 0.6;
const VOID_PARTICLE_OPACITY_MAX = 1;
const VOID_PARTICLE_OPACITY_FINAL = 0.6;
const VOID_PARTICLE_INITIAL_SCALE = 1;
const VOID_PARTICLE_INITIAL_OPACITY = 0.6;
const VOID_PARTICLE_RADIUS = 60;
const VOID_PARTICLE_DELAY_BASE = 0.2;
const DEGREES_IN_CIRCLE = 360;
const DEGREES_TO_RADIANS_DIVISOR = 180;
const RADIANS_IN_DEGREE = Math.PI / DEGREES_TO_RADIANS_DIVISOR;
const PROTECTIVE_SPHERE_SIZE = 80;
const SPHERE_ANIMATION_DURATION = 2.8;
const SPHERE_OPACITY_PEAK = 0.4;
const SPHERE_SCALE_MIN = 0.8;
const SPHERE_SCALE_MAX = 1.1;
const SPHERE_SCALE_FINAL = 0.8;
const SPHERE_OPACITY_MIN = 0.2;
const SPHERE_OPACITY_FINAL = 0.2;
const POSITION_PERCENTAGE_50 = "50%";
const TRANSLATE_CENTER = "translate(-50%, -50%)";
const BOX_SHADOW_VOID_BURST = "0 0 25px rgba(147, 112, 219, 0.8)";
const BOX_SHADOW_TARGETING = "0 0 15px rgba(147, 112, 219, 0.6)";
const BOX_SHADOW_PARTICLE = "0 0 10px rgba(147, 112, 219, 0.9)";
const BOX_SHADOW_SPHERE = "0 0 30px rgba(147, 112, 219, 0.5)";
const COLOR_VOID_PRIMARY = "#9370DB";
const COLOR_VOID_BORDER = "#DA70D6";
const COLOR_VOID_SECONDARY = "#4B0082";
const GRADIENT_VOID_BURST = `radial-gradient(circle, ${COLOR_VOID_PRIMARY} 0%, ${COLOR_VOID_SECONDARY} 50%, transparent 70%)`;
const GRADIENT_SPHERE =
  "radial-gradient(circle, rgba(147, 112, 219, 0.1) 0%, transparent 70%)";

export function KaisaAnimation({
  isActive,
  progress: _progress,
}: ChampionAnimationProps) {
  if (!isActive) {
    return null;
  }

  return (
    <motion.div className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* Void burst effects */}
      {Array.from({ length: VOID_BURST_COUNT }, (_, i) => (
        <motion.div
          animate={{
            scale: [
              VOID_BURST_SCALE_MIN,
              VOID_BURST_MAX_SCALE,
              VOID_BURST_SCALE_FINAL,
            ],
            opacity: [
              VOID_BURST_OPACITY_MIN,
              VOID_BURST_OPACITY_PEAK,
              VOID_BURST_OPACITY_FINAL,
            ],
          }}
          className="absolute rounded-full"
          initial={{
            scale: VOID_BURST_INITIAL_SCALE,
            opacity: VOID_BURST_INITIAL_OPACITY,
          }}
          key={`kaisa-void-burst-${i}-position-${VOID_BURST_TOP_BASE + i * VOID_BURST_TOP_INCREMENT}-${VOID_BURST_LEFT_BASE + i * VOID_BURST_LEFT_INCREMENT}`}
          style={{
            width: `${VOID_BURST_SIZE}px`,
            height: `${VOID_BURST_SIZE}px`,
            top: `${VOID_BURST_TOP_BASE + i * VOID_BURST_TOP_INCREMENT}%`,
            left: `${VOID_BURST_LEFT_BASE + i * VOID_BURST_LEFT_INCREMENT}%`,
            background: GRADIENT_VOID_BURST,
            boxShadow: BOX_SHADOW_VOID_BURST,
          }}
          transition={{
            duration: VOID_BURST_ANIMATION_DURATION,
            delay: i * VOID_BURST_DELAY_BASE,
            repeat: Number.POSITIVE_INFINITY,
          }}
        />
      ))}

      {/* Precise targeting rings */}
      {Array.from({ length: TARGETING_RING_COUNT }, (_, i) => (
        <motion.div
          animate={{
            scale: [
              TARGETING_SCALE_MIN,
              TARGETING_SCALE_MAX,
              TARGETING_SCALE_FINAL,
            ],
            opacity: [
              TARGETING_OPACITY_MIN,
              TARGETING_OPACITY_MAX,
              TARGETING_OPACITY_FINAL,
            ],
            rotate: [
              TARGETING_ROTATION_MIN,
              TARGETING_ROTATION_MID,
              TARGETING_ROTATION_MAX,
            ],
          }}
          className="absolute rounded-full border-2"
          initial={{
            scale: TARGETING_INITIAL_SCALE,
            opacity: TARGETING_INITIAL_OPACITY,
          }}
          key={`kaisa-targeting-${i}-position-${TARGETING_TOP_BASE + i * TARGETING_TOP_INCREMENT}-${TARGETING_LEFT_BASE + i * TARGETING_LEFT_INCREMENT}`}
          style={{
            width: `${TARGETING_RING_SIZE}px`,
            height: `${TARGETING_RING_SIZE}px`,
            top: `${TARGETING_TOP_BASE + i * TARGETING_TOP_INCREMENT}%`,
            left: `${TARGETING_LEFT_BASE + i * TARGETING_LEFT_INCREMENT}%`,
            borderColor: COLOR_VOID_PRIMARY,
            boxShadow: BOX_SHADOW_TARGETING,
          }}
          transition={{
            duration: TARGETING_ANIMATION_DURATION,
            delay: i * TARGETING_DELAY_BASE,
            repeat: Number.POSITIVE_INFINITY,
            repeatType: "reverse",
          }}
        />
      ))}

      {/* Void particles */}
      {Array.from({ length: VOID_PARTICLE_COUNT }, (_, i) => {
        const angle = (i * DEGREES_IN_CIRCLE) / VOID_PARTICLE_COUNT;
        const radius = VOID_PARTICLE_RADIUS;
        const x = Math.cos(angle * RADIANS_IN_DEGREE) * radius;
        const y = Math.sin(angle * RADIANS_IN_DEGREE) * radius;

        return (
          <motion.div
            animate={{
              scale: [
                VOID_PARTICLE_SCALE_MIN,
                VOID_PARTICLE_SCALE_MAX,
                VOID_PARTICLE_SCALE_FINAL,
              ],
              opacity: [
                VOID_PARTICLE_OPACITY_MIN,
                VOID_PARTICLE_OPACITY_MAX,
                VOID_PARTICLE_OPACITY_FINAL,
              ],
              x: [0, x, 0],
              y: [0, y, 0],
            }}
            className="absolute rounded-full"
            initial={{
              scale: VOID_PARTICLE_INITIAL_SCALE,
              opacity: VOID_PARTICLE_INITIAL_OPACITY,
            }}
            key={`kaisa-void-particle-${i}-angle-${angle}-radius-${radius}`}
            style={{
              width: `${VOID_PARTICLE_SIZE}px`,
              height: `${VOID_PARTICLE_SIZE}px`,
              top: POSITION_PERCENTAGE_50,
              left: POSITION_PERCENTAGE_50,
              backgroundColor: COLOR_VOID_PRIMARY,
              boxShadow: BOX_SHADOW_PARTICLE,
            }}
            transition={{
              duration: VOID_PARTICLE_ANIMATION_DURATION,
              delay: i * VOID_PARTICLE_DELAY_BASE,
              repeat: Number.POSITIVE_INFINITY,
              repeatType: "reverse",
            }}
          />
        );
      })}

      {/* Protective sphere */}
      <motion.div
        animate={{
          scale: [SPHERE_SCALE_MIN, SPHERE_SCALE_MAX, SPHERE_SCALE_FINAL],
          opacity: [
            SPHERE_OPACITY_MIN,
            SPHERE_OPACITY_PEAK,
            SPHERE_OPACITY_FINAL,
          ],
        }}
        className="absolute rounded-full border-2"
        style={{
          width: `${PROTECTIVE_SPHERE_SIZE}px`,
          height: `${PROTECTIVE_SPHERE_SIZE}px`,
          top: POSITION_PERCENTAGE_50,
          left: POSITION_PERCENTAGE_50,
          transform: TRANSLATE_CENTER,
          borderColor: COLOR_VOID_BORDER,
          background: GRADIENT_SPHERE,
          boxShadow: BOX_SHADOW_SPHERE,
        }}
        transition={{
          duration: SPHERE_ANIMATION_DURATION,
          repeat: Number.POSITIVE_INFINITY,
          repeatType: "reverse",
        }}
      />
    </motion.div>
  );
}
