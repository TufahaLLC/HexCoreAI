"use client";

import { motion } from "motion/react";

type ChampionAnimationProps = {
  isActive: boolean;
  progress: number;
};

// Animation constants for Braum's shield and teamwork effects
const SHIELD_SIZE = 70;
const SHIELD_ANIMATION_DURATION = 2.5;
const SHIELD_OPACITY_PEAK = 0.7;
const SUPPORTIVE_AURA_SIZE = 90;
const AURA_ANIMATION_DURATION = 3;
const AURA_OPACITY_PEAK = 0.4;
const STRENGTH_ORB_COUNT = 5;
const ORB_SIZE = 12;
const ORB_ANIMATION_DURATION = 2.8;
const PROTECTIVE_BARRIER_COUNT = 3;
const BARRIER_WIDTH = 4;
const BARRIER_LENGTH = 60;
const BARRIER_ANIMATION_DURATION = 2.2;
const UNITED_ENERGY_PARTICLES = 10;
const PARTICLE_ANIMATION_DURATION = 3.5;
const SHIELD_SCALE_MIN = 0.8;
const SHIELD_SCALE_MAX = 1.1;
const SHIELD_OPACITY_MIN = 0.5;
const SHIELD_ROTATION_MIN = 0;
const SHIELD_ROTATION_POS = 5;
const SHIELD_ROTATION_NEG = -5;
const AURA_SCALE_MIN = 0.9;
const AURA_SCALE_MAX = 1.2;
const AURA_OPACITY_MIN = 0.2;
const DEGREES_IN_CIRCLE = 360;
const DEGREES_TO_RADIANS_DIVISOR = 180;
const ORB_RADIUS = 50;
const ORB_SCALE_MIN = 1;
const ORB_SCALE_MAX = 1.3;
const ORB_OPACITY_MIN = 0.6;
const ORB_OPACITY_MAX = 1;
const ORB_TRAJECTORY_FACTOR = 0.5;
const ORB_DELAY_BASE = 0.4;
const BARRIER_WIDTH_MIN = 0;
const BARRIER_OPACITY_MIN = 0;
const BARRIER_OPACITY_MAX = 0.8;
const BARRIER_OPACITY_END = 0.4;
const BARRIER_TOP_BASE = 30;
const BARRIER_TOP_INCREMENT = 15;
const BARRIER_LEFT_BASE = 15;
const BARRIER_LEFT_INCREMENT = 20;
const BARRIER_ROTATION_BASE = -30;
const BARRIER_ROTATION_INCREMENT = 20;
const BARRIER_DELAY_BASE = 0.6;
const ENERGY_PARTICLE_RADIUS = 35;
const ENERGY_PARTICLE_SCALE_MIN = 0.8;
const ENERGY_PARTICLE_SCALE_MAX = 1.2;
const ENERGY_PARTICLE_OPACITY_MIN = 0.4;
const ENERGY_PARTICLE_OPACITY_MAX = 0.9;
const ENERGY_PARTICLE_TRAJECTORY_FACTOR = 0.5;
const ENERGY_PARTICLE_SIZE = 6;
const ENERGY_PARTICLE_DELAY_BASE = 0.3;
const HEART_GLOW_SIZE = 30;
const HEART_GLOW_SCALE_MIN = 1;
const HEART_GLOW_SCALE_MAX = 1.1;
const HEART_GLOW_OPACITY_MIN = 0.3;
const HEART_GLOW_OPACITY_MAX = 0.6;
const HEART_GLOW_DURATION = 2;

export function BraumAnimation({
  isActive,
  progress: _progress,
}: ChampionAnimationProps) {
  if (!isActive) {
    return null;
  }

  return (
    <motion.div className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* Central shield */}
      <motion.div
        animate={{
          scale: [SHIELD_SCALE_MIN, SHIELD_SCALE_MAX, SHIELD_SCALE_MIN],
          opacity: [
            SHIELD_OPACITY_MIN,
            SHIELD_OPACITY_PEAK,
            SHIELD_OPACITY_MIN,
          ],
          rotate: [
            SHIELD_ROTATION_MIN,
            SHIELD_ROTATION_POS,
            SHIELD_ROTATION_NEG,
            SHIELD_ROTATION_MIN,
          ],
        }}
        className="absolute rounded-full border-4"
        style={{
          width: `${SHIELD_SIZE}px`,
          height: `${SHIELD_SIZE}px`,
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          borderColor: "#4682B4",
          background:
            "radial-gradient(circle, rgba(70, 130, 180, 0.2) 0%, rgba(70, 130, 180, 0.05) 70%)",
          boxShadow: "0 0 30px rgba(70, 130, 180, 0.8)",
        }}
        transition={{
          duration: SHIELD_ANIMATION_DURATION,
          repeat: Number.POSITIVE_INFINITY,
          repeatType: "reverse",
        }}
      />

      {/* Supportive aura */}
      <motion.div
        animate={{
          scale: [AURA_SCALE_MIN, AURA_SCALE_MAX, AURA_SCALE_MIN],
          opacity: [AURA_OPACITY_MIN, AURA_OPACITY_PEAK, AURA_OPACITY_MIN],
        }}
        className="absolute rounded-full"
        style={{
          width: `${SUPPORTIVE_AURA_SIZE}px`,
          height: `${SUPPORTIVE_AURA_SIZE}px`,
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          background:
            "radial-gradient(circle, rgba(135, 206, 235, 0.3) 0%, rgba(70, 130, 180, 0.1) 50%, transparent 70%)",
          boxShadow: "0 0 40px rgba(70, 130, 180, 0.6)",
        }}
        transition={{
          duration: AURA_ANIMATION_DURATION,
          repeat: Number.POSITIVE_INFINITY,
          repeatType: "reverse",
        }}
      />

      {/* Strength orbs representing teamwork */}
      {Array.from({ length: STRENGTH_ORB_COUNT }, (_, i) => {
        const angle = (i * DEGREES_IN_CIRCLE) / STRENGTH_ORB_COUNT;
        const radius = ORB_RADIUS;
        const x =
          Math.cos((angle * Math.PI) / DEGREES_TO_RADIANS_DIVISOR) * radius;
        const y =
          Math.sin((angle * Math.PI) / DEGREES_TO_RADIANS_DIVISOR) * radius;

        return (
          <motion.div
            animate={{
              scale: [ORB_SCALE_MIN, ORB_SCALE_MAX, ORB_SCALE_MIN],
              opacity: [ORB_OPACITY_MIN, ORB_OPACITY_MAX, ORB_OPACITY_MIN],
              x: [0, x * ORB_TRAJECTORY_FACTOR, x],
              y: [0, y * ORB_TRAJECTORY_FACTOR, y],
            }}
            className="absolute rounded-full"
            initial={{ scale: ORB_SCALE_MIN, opacity: ORB_OPACITY_MIN }}
            key={`braum-strength-orb-${i}-angle-${angle}`}
            style={{
              width: `${ORB_SIZE}px`,
              height: `${ORB_SIZE}px`,
              top: "50%",
              left: "50%",
              backgroundColor: "#4682B4",
              boxShadow: "0 0 15px rgba(70, 130, 180, 0.9)",
            }}
            transition={{
              duration: ORB_ANIMATION_DURATION,
              delay: i * ORB_DELAY_BASE,
              repeat: Number.POSITIVE_INFINITY,
              repeatType: "reverse",
            }}
          />
        );
      })}

      {/* Protective barriers */}
      {Array.from({ length: PROTECTIVE_BARRIER_COUNT }, (_, i) => (
        <motion.div
          animate={{
            width: [BARRIER_WIDTH_MIN, BARRIER_LENGTH, BARRIER_LENGTH],
            opacity: [
              BARRIER_OPACITY_MIN,
              BARRIER_OPACITY_MAX,
              BARRIER_OPACITY_END,
            ],
          }}
          className="absolute"
          initial={{ width: BARRIER_WIDTH_MIN, opacity: BARRIER_OPACITY_MIN }}
          key={`braum-barrier-${i}-length-${BARRIER_LENGTH}`}
          style={{
            height: `${BARRIER_WIDTH}px`,
            top: `${BARRIER_TOP_BASE + i * BARRIER_TOP_INCREMENT}%`,
            left: `${BARRIER_LEFT_BASE + i * BARRIER_LEFT_INCREMENT}%`,
            backgroundColor: "#4682B4",
            transform: `rotate(${BARRIER_ROTATION_BASE + i * BARRIER_ROTATION_INCREMENT}deg)`,
            boxShadow: "0 0 12px rgba(70, 130, 180, 0.7)",
          }}
          transition={{
            duration: BARRIER_ANIMATION_DURATION,
            delay: i * BARRIER_DELAY_BASE,
            repeat: Number.POSITIVE_INFINITY,
            repeatType: "reverse",
          }}
        />
      ))}

      {/* United energy particles */}
      {Array.from({ length: UNITED_ENERGY_PARTICLES }, (_, i) => {
        const angle = (i * DEGREES_IN_CIRCLE) / UNITED_ENERGY_PARTICLES;
        const radius = ENERGY_PARTICLE_RADIUS;
        const x =
          Math.cos((angle * Math.PI) / DEGREES_TO_RADIANS_DIVISOR) * radius;
        const y =
          Math.sin((angle * Math.PI) / DEGREES_TO_RADIANS_DIVISOR) * radius;

        return (
          <motion.div
            animate={{
              scale: [
                ENERGY_PARTICLE_SCALE_MIN,
                ENERGY_PARTICLE_SCALE_MAX,
                ENERGY_PARTICLE_SCALE_MIN,
              ],
              opacity: [
                ENERGY_PARTICLE_OPACITY_MIN,
                ENERGY_PARTICLE_OPACITY_MAX,
                ENERGY_PARTICLE_OPACITY_MIN,
              ],
              x: [
                x * ENERGY_PARTICLE_TRAJECTORY_FACTOR,
                x,
                x * ENERGY_PARTICLE_TRAJECTORY_FACTOR,
              ],
              y: [
                y * ENERGY_PARTICLE_TRAJECTORY_FACTOR,
                y,
                y * ENERGY_PARTICLE_TRAJECTORY_FACTOR,
              ],
            }}
            className="absolute rounded-full"
            initial={{
              scale: ENERGY_PARTICLE_SCALE_MIN,
              opacity: ENERGY_PARTICLE_OPACITY_MIN,
            }}
            key={`braum-energy-particle-${i}-angle-${angle}`}
            style={{
              width: `${ENERGY_PARTICLE_SIZE}px`,
              height: `${ENERGY_PARTICLE_SIZE}px`,
              top: "50%",
              left: "50%",
              backgroundColor: "#87CEEB",
              boxShadow: "0 0 10px rgba(135, 206, 235, 0.8)",
            }}
            transition={{
              duration: PARTICLE_ANIMATION_DURATION,
              delay: i * ENERGY_PARTICLE_DELAY_BASE,
              repeat: Number.POSITIVE_INFINITY,
              repeatType: "reverse",
            }}
          />
        );
      })}

      {/* Warm orange glow representing heart of the Freljord */}
      <motion.div
        animate={{
          scale: [
            HEART_GLOW_SCALE_MIN,
            HEART_GLOW_SCALE_MAX,
            HEART_GLOW_SCALE_MIN,
          ],
          opacity: [
            HEART_GLOW_OPACITY_MIN,
            HEART_GLOW_OPACITY_MAX,
            HEART_GLOW_OPACITY_MIN,
          ],
        }}
        className="absolute rounded-full"
        style={{
          width: `${HEART_GLOW_SIZE}px`,
          height: `${HEART_GLOW_SIZE}px`,
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          background:
            "radial-gradient(circle, #FFA500 0%, #FF8C00 50%, transparent 70%)",
          boxShadow: "0 0 20px rgba(255, 165, 0, 0.8)",
        }}
        transition={{
          duration: HEART_GLOW_DURATION,
          repeat: Number.POSITIVE_INFINITY,
          repeatType: "reverse",
        }}
      />
    </motion.div>
  );
}
