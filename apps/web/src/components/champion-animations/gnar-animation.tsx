"use client";

import { motion } from "motion/react";

type ChampionAnimationProps = {
  isActive: boolean;
  progress: number;
};

// Animation constants for Gnar's transformation effects
const TRANSFORMATION_ORB_SIZE = 50;
const TRANSFORMATION_ANIMATION_DURATION = 3;
const TRANSFORMATION_OPACITY_PEAK = 0.8;
const BOOMERANG_SIZE = 30;
const BOOMERANG_COUNT = 2;
const BOOMERANG_ANIMATION_DURATION = 2.5;
const BOOMERANG_SCALE_MIN = 1;
const BOOMERANG_SCALE_MAX = 1.2;
const BOOMERANG_OPACITY_MIN = 0.7;
const BOOMERANG_OPACITY_MAX = 1;
const BOOMERANG_X_OFFSET = 40;
const BOOMERANG_Y_OFFSET = 30;
const BOOMERANG_HEIGHT_RATIO = 3;
const BOOMERANG_DELAY_BASE = 1.2;
const RAGE_PARTICLE_COUNT = 12;
const RAGE_PARTICLE_SIZE = 8;
const RAGE_PARTICLE_ANIMATION_DURATION = 2.8;
const RAGE_PARTICLE_SCALE_MIN = 0.5;
const RAGE_PARTICLE_SCALE_MAX = 1.5;
const RAGE_PARTICLE_OPACITY_MIN = 0.3;
const RAGE_PARTICLE_OPACITY_MAX = 0.9;
const RAGE_PARTICLE_RADIUS = 45;
const RAGE_PARTICLE_DELAY_BASE = 0.2;
const DEGREES_IN_CIRCLE = 360;
const DEGREES_TO_RADIANS_DIVISOR = 180;
const RADIANS_IN_DEGREE = Math.PI / DEGREES_TO_RADIANS_DIVISOR;
const GROWTH_RING_COUNT = 4;
const GROWTH_RING_MAX_SIZE = 80;
const GROWTH_ANIMATION_DURATION = 2.2;
const GROWTH_RING_SCALE_MAX = 1.2;
const GROWTH_RING_OPACITY_PEAK = 0.6;
const GROWTH_RING_DELAY_BASE = 0.8;
const ADAPTIVE_PULSE_COUNT = 3;
const PULSE_ANIMATION_DURATION = 3.5;
const PULSE_SCALE_MIN = 0.5;
const PULSE_SCALE_MAX = 1.8;
const PULSE_OPACITY_PEAK = 0.5;
const PULSE_SIZE = 40;
const PULSE_DELAY_BASE = 1;
const TRANSFORMATION_INDICATOR_SIZE = 25;
const TRANSFORMATION_INDICATOR_SCALE_MIN = 1;
const TRANSFORMATION_INDICATOR_SCALE_MAX = 1.4;
const TRANSFORMATION_INDICATOR_OPACITY_MIN = 0.6;
const TRANSFORMATION_INDICATOR_OPACITY_MAX = 0.9;
const TRANSFORMATION_INDICATOR_DURATION = 1.8;
const RAGE_PARTICLE_TRAJECTORY_FACTOR = 0.7;
const BOX_SHADOW_BLUR_RADIUS = 12;
const PULSE_TOP_BASE = 25;
const PULSE_TOP_INCREMENT = 20;
const PULSE_LEFT_BASE = 20;
const PULSE_LEFT_INCREMENT = 25;
const BOX_SHADOW_PULSE_BLUR = 25;
const MODULO_DIVISOR = 3;
const MODULO_FIRST_VALUE = 0;
const MODULO_SECOND_VALUE = 1;
const TRANSFORMATION_ORB_SCALE_MIN = 0.8;
const TRANSFORMATION_ORB_SCALE_MAX = 1.3;
const TRANSFORMATION_ORB_OPACITY_MIN = 0.5;
const TRANSFORMATION_ORB_ROTATION_MIN = 0;
const TRANSFORMATION_ORB_ROTATION_MID = 180;
const TRANSFORMATION_ORB_ROTATION_MAX = 360;

// Helper functions for color selection
function getRageParticleColor(index: number): string {
  if (index % MODULO_DIVISOR === MODULO_FIRST_VALUE) {
    return "#32CD32";
  }
  if (index % MODULO_DIVISOR === MODULO_SECOND_VALUE) {
    return "#FF4500";
  }
  return "#32CD32";
}

function getRageParticleShadow(index: number): string {
  if (index % MODULO_DIVISOR === MODULO_FIRST_VALUE) {
    return "rgba(50, 205, 50, 0.8)";
  }
  return "rgba(255, 69, 0, 0.8)";
}

function getAdaptivePulseColor(index: number): string {
  if (index === MODULO_FIRST_VALUE) {
    return "#32CD32";
  }
  if (index === MODULO_SECOND_VALUE) {
    return "#8B4513";
  }
  return "#32CD32";
}

function getAdaptivePulseShadow(index: number): string {
  if (index === MODULO_FIRST_VALUE) {
    return "rgba(50, 205, 50, 0.7)";
  }
  if (index === MODULO_SECOND_VALUE) {
    return "rgba(139, 69, 19, 0.7)";
  }
  return "rgba(50, 205, 50, 0.7)";
}

export function GnarAnimation({
  isActive,
  progress: _progress,
}: ChampionAnimationProps) {
  if (!isActive) {
    return null;
  }

  return (
    <motion.div className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* Central transformation orb */}
      <motion.div
        animate={{
          scale: [
            TRANSFORMATION_ORB_SCALE_MIN,
            TRANSFORMATION_ORB_SCALE_MAX,
            TRANSFORMATION_ORB_SCALE_MIN,
          ],
          opacity: [
            TRANSFORMATION_ORB_OPACITY_MIN,
            TRANSFORMATION_OPACITY_PEAK,
            TRANSFORMATION_ORB_OPACITY_MIN,
          ],
          rotate: [
            TRANSFORMATION_ORB_ROTATION_MIN,
            TRANSFORMATION_ORB_ROTATION_MID,
            TRANSFORMATION_ORB_ROTATION_MAX,
          ],
        }}
        className="absolute rounded-full"
        style={{
          width: `${TRANSFORMATION_ORB_SIZE}px`,
          height: `${TRANSFORMATION_ORB_SIZE}px`,
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          background:
            "radial-gradient(circle, #32CD32 0%, #228B22 50%, #006400 100%)",
          boxShadow: "0 0 35px rgba(50, 205, 50, 0.8)",
        }}
        transition={{
          duration: TRANSFORMATION_ANIMATION_DURATION,
          repeat: Number.POSITIVE_INFINITY,
          repeatType: "reverse",
        }}
      />

      {/* Boomerang attacks */}
      {Array.from({ length: BOOMERANG_COUNT }, (_, i) => (
        <motion.div
          animate={{
            rotate: [0, DEGREES_IN_CIRCLE, DEGREES_IN_CIRCLE * 2],
            scale: [
              BOOMERANG_SCALE_MIN,
              BOOMERANG_SCALE_MAX,
              BOOMERANG_SCALE_MIN,
            ],
            opacity: [
              BOOMERANG_OPACITY_MIN,
              BOOMERANG_OPACITY_MAX,
              BOOMERANG_OPACITY_MIN,
            ],
            x: [0, BOOMERANG_X_OFFSET, 0, -BOOMERANG_X_OFFSET, 0],
            y: [0, -BOOMERANG_Y_OFFSET, 0, BOOMERANG_Y_OFFSET, 0],
          }}
          className="absolute"
          initial={{ rotate: 0 }}
          key={`gnar-boomerang-${i}-count-${BOOMERANG_COUNT}`}
          style={{
            width: `${BOOMERANG_SIZE}px`,
            height: `${BOOMERANG_SIZE / BOOMERANG_HEIGHT_RATIO}px`,
            top: "50%",
            left: "50%",
            backgroundColor: "#32CD32",
            borderRadius: "50%",
            boxShadow: "0 0 15px rgba(50, 205, 50, 0.9)",
          }}
          transition={{
            duration: BOOMERANG_ANIMATION_DURATION,
            delay: i * BOOMERANG_DELAY_BASE,
            repeat: Number.POSITIVE_INFINITY,
          }}
        />
      ))}

      {/* Rage particles for transformation */}
      {Array.from({ length: RAGE_PARTICLE_COUNT }, (_, i) => {
        const angle = (i * DEGREES_IN_CIRCLE) / RAGE_PARTICLE_COUNT;
        const radius = RAGE_PARTICLE_RADIUS;
        const x = Math.cos(angle * RADIANS_IN_DEGREE) * radius;
        const y = Math.sin(angle * RADIANS_IN_DEGREE) * radius;

        return (
          <motion.div
            animate={{
              scale: [
                RAGE_PARTICLE_SCALE_MIN,
                RAGE_PARTICLE_SCALE_MAX,
                RAGE_PARTICLE_SCALE_MIN,
              ],
              opacity: [
                RAGE_PARTICLE_OPACITY_MIN,
                RAGE_PARTICLE_OPACITY_MAX,
                RAGE_PARTICLE_OPACITY_MIN,
              ],
              backgroundColor: getRageParticleColor(i),
              x: [0, x * RAGE_PARTICLE_TRAJECTORY_FACTOR, x],
              y: [0, y * RAGE_PARTICLE_TRAJECTORY_FACTOR, y],
            }}
            className="absolute rounded-full"
            initial={{
              scale: RAGE_PARTICLE_SCALE_MIN,
              opacity: RAGE_PARTICLE_OPACITY_MIN,
            }}
            key={`gnar-rage-particle-${i}-angle-${angle}`}
            style={{
              width: `${RAGE_PARTICLE_SIZE}px`,
              height: `${RAGE_PARTICLE_SIZE}px`,
              top: "50%",
              left: "50%",
              boxShadow: `0 0 ${BOX_SHADOW_BLUR_RADIUS}px ${getRageParticleShadow(i)}`,
            }}
            transition={{
              duration: RAGE_PARTICLE_ANIMATION_DURATION,
              delay: i * RAGE_PARTICLE_DELAY_BASE,
              repeat: Number.POSITIVE_INFINITY,
              repeatType: "reverse",
            }}
          />
        );
      })}

      {/* Growth rings for size transformation */}
      {Array.from({ length: GROWTH_RING_COUNT }, (_, i) => (
        <motion.div
          animate={{
            scale: [0, GROWTH_RING_SCALE_MAX, 0],
            opacity: [0, GROWTH_RING_OPACITY_PEAK, 0],
          }}
          className="absolute rounded-full border-2"
          initial={{ scale: 0, opacity: 0 }}
          key={`gnar-growth-ring-${i}-size-${GROWTH_RING_MAX_SIZE}`}
          style={{
            width: `${GROWTH_RING_MAX_SIZE}px`,
            height: `${GROWTH_RING_MAX_SIZE}px`,
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            borderColor: "#32CD32",
            boxShadow: "0 0 20px rgba(50, 205, 50, 0.6)",
          }}
          transition={{
            duration: GROWTH_ANIMATION_DURATION,
            delay: i * GROWTH_RING_DELAY_BASE,
            repeat: Number.POSITIVE_INFINITY,
          }}
        />
      ))}

      {/* Adaptive pulses representing form changes */}
      {Array.from({ length: ADAPTIVE_PULSE_COUNT }, (_, i) => (
        <motion.div
          animate={{
            scale: [PULSE_SCALE_MIN, PULSE_SCALE_MAX, PULSE_SCALE_MIN],
            opacity: [0, PULSE_OPACITY_PEAK, 0],
            backgroundColor: getAdaptivePulseColor(i),
          }}
          className="absolute rounded-full"
          initial={{ scale: PULSE_SCALE_MIN, opacity: 0 }}
          key={`gnar-adaptive-pulse-${i}-size-${PULSE_SIZE}`}
          style={{
            width: `${PULSE_SIZE}px`,
            height: `${PULSE_SIZE}px`,
            top: `${PULSE_TOP_BASE + i * PULSE_TOP_INCREMENT}%`,
            left: `${PULSE_LEFT_BASE + i * PULSE_LEFT_INCREMENT}%`,
            boxShadow: `0 0 ${BOX_SHADOW_PULSE_BLUR}px ${getAdaptivePulseShadow(i)}`,
          }}
          transition={{
            duration: PULSE_ANIMATION_DURATION,
            delay: i * PULSE_DELAY_BASE,
            repeat: Number.POSITIVE_INFINITY,
          }}
        />
      ))}

      {/* Mini to Mega transformation indicator */}
      <motion.div
        animate={{
          scale: [
            TRANSFORMATION_INDICATOR_SCALE_MIN,
            TRANSFORMATION_INDICATOR_SCALE_MAX,
            TRANSFORMATION_INDICATOR_SCALE_MIN,
          ],
          opacity: [
            TRANSFORMATION_INDICATOR_OPACITY_MIN,
            TRANSFORMATION_INDICATOR_OPACITY_MAX,
            TRANSFORMATION_INDICATOR_OPACITY_MIN,
          ],
        }}
        className="absolute rounded-full"
        style={{
          width: `${TRANSFORMATION_INDICATOR_SIZE}px`,
          height: `${TRANSFORMATION_INDICATOR_SIZE}px`,
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          background:
            "radial-gradient(circle, #32CD32 0%, #228B22 50%, transparent 70%)",
          boxShadow: "0 0 20px rgba(50, 205, 50, 0.8)",
        }}
        transition={{
          duration: TRANSFORMATION_INDICATOR_DURATION,
          repeat: Number.POSITIVE_INFINITY,
          repeatType: "reverse",
        }}
      />
    </motion.div>
  );
}
