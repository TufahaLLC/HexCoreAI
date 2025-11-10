"use client";

import { AnimatePresence, motion } from "motion/react";
import { CHAMPION_AGENTS } from "@/hooks/use-hex-core-web-socket";

const ANGLE_MULTIPLIER = 100;

// Animation constants - designed to support 11 agents dynamically
const OUTER_RADIUS = 150;
const INNER_RADIUS = 105;
const _PORTRAIT_SIZE = 64; // w-16 h-16 in pixels
const _HEIMERDINGER_SIZE = 96; // w-24 h-24 in pixels
const EUREKA_SCALE = 1.5;
const SPARKLE_COUNT = 8;
const SPARKLE_DISTANCE = 80;
const ROTATION_DEGREES = 180;
const PULSE_SCALE = 1.5;
const GLOW_OPACITY_HIGH = 0.6;
const GLOW_OPACITY_LOW = 0.3;
const ANIMATION_DURATION_PHASE1 = 1.5;
const ANIMATION_DURATION_PHASE2 = 1;
const ANIMATION_DURATION_PHASE3 = 1;
const ANIMATION_DURATION_PHASE4 = 1;
const ANIMATION_DURATION_PHASE5 = 2;
const ANIMATION_DELAY_PHASE2 = 1;
const ANIMATION_DELAY_PHASE3 = 2;
const ANIMATION_DELAY_PHASE4 = 2.5;
const ANIMATION_DELAY_PHASE5 = 5;
const STAGGER_DELAY = 0.1;
const SPRING_STIFFNESS = 100;
const SPRING_DAMPING = 15;
const PULSE_DURATION = 2;
const SPARKLE_DURATION = 1.5;
const EUREKA_START_TIME = 0;
const EUREKA_MID_TIME = 0.5;
const EUREKA_END_TIME = 1;
const EUREKA_TIMES = [EUREKA_START_TIME, EUREKA_MID_TIME, EUREKA_END_TIME];
const TWO_PI = Math.PI * 2;

type HeimerdingerSynthesisProps = {
  isActive: boolean;
  completedAgents: string[];
};

export function HeimerdingerSynthesis({
  isActive,
  completedAgents,
}: HeimerdingerSynthesisProps) {
  if (!isActive) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        animate={{ opacity: 1 }}
        className="pointer-events-none absolute inset-0 z-50"
        exit={{ opacity: 0 }}
        initial={{ opacity: 0 }}
      >
        {/* Phase 1: Champion Portraits Converge (0-1.5s) */}
        {completedAgents.map((agent, i) => {
          const angle = (TWO_PI / completedAgents.length) * i;
          const outerRadius = OUTER_RADIUS;
          const innerRadius = INNER_RADIUS;

          return (
            <motion.div
              animate={{
                x: Math.cos(angle) * innerRadius,
                y: Math.sin(angle) * innerRadius,
                opacity: 1,
              }}
              className="absolute top-1/2 left-1/2 transform"
              initial={{
                x: Math.cos(angle) * outerRadius,
                y: Math.sin(angle) * outerRadius,
                opacity: 0.5,
              }}
              key={agent}
              transition={{
                duration: ANIMATION_DURATION_PHASE1,
                ease: "easeOut",
                delay: i * STAGGER_DELAY,
              }}
            >
              <div
                className="h-16 w-16 rounded-full border-4"
                style={{
                  borderColor:
                    CHAMPION_AGENTS[agent as keyof typeof CHAMPION_AGENTS]
                      ?.laserColor,
                  boxShadow: `0 0 20px ${CHAMPION_AGENTS[agent as keyof typeof CHAMPION_AGENTS]?.laserColor}`,
                  backgroundColor: `${CHAMPION_AGENTS[agent as keyof typeof CHAMPION_AGENTS]?.laserColor}20`,
                }}
              />
            </motion.div>
          );
        })}

        {/* Phase 2: Energy Beams Connect (1-2s) */}
        {completedAgents.map((agent, i) => {
          const angle = (TWO_PI / completedAgents.length) * i;
          const radius = INNER_RADIUS; // Use inner radius for beam target

          return (
            <motion.svg
              aria-label={`Energy beam connecting to ${CHAMPION_AGENTS[agent as keyof typeof CHAMPION_AGENTS]?.champion || "agent"}`}
              className="pointer-events-none absolute inset-0"
              height="100%"
              key={`beam-${agent}`}
              role="img"
              style={{ overflow: "visible" }}
              width="100%"
            >
              <motion.line
                animate={{ pathLength: 1, opacity: 0.8 }}
                initial={{ pathLength: 0, opacity: 0 }}
                stroke={
                  CHAMPION_AGENTS[agent as keyof typeof CHAMPION_AGENTS]
                    ?.laserColor
                }
                strokeLinecap="round"
                strokeWidth="3"
                style={{
                  filter: `drop-shadow(0 0 6px ${CHAMPION_AGENTS[agent as keyof typeof CHAMPION_AGENTS]?.laserColor})`,
                }}
                transition={{
                  duration: ANIMATION_DURATION_PHASE2,
                  delay: ANIMATION_DELAY_PHASE2 + i * STAGGER_DELAY,
                  ease: "easeOut",
                }}
                x1="50%"
                x2={`calc(50% + ${Math.cos(angle) * radius}px)`}
                y1="50%"
                y2={`calc(50% + ${Math.sin(angle) * radius}px)`}
              />
            </motion.svg>
          );
        })}

        {/* Phase 3: Heimerdinger Appears (2-3s) */}
        <motion.div
          animate={{ scale: 1, rotate: 0 }}
          className="-translate-x-1/2 -translate-y-1/2 absolute top-1/2 left-1/2 transform"
          initial={{ scale: 0, rotate: -180 }}
          transition={{
            duration: ANIMATION_DURATION_PHASE3,
            delay: ANIMATION_DELAY_PHASE3,
            type: "spring",
            stiffness: SPRING_STIFFNESS,
            damping: SPRING_DAMPING,
          }}
        >
          <div className="relative">
            {/* Heimerdinger avatar with gradient background */}
            <motion.div
              animate={{
                boxShadow: [
                  "0 0 20px rgba(255, 105, 180, 0.6)",
                  "0 0 40px rgba(255, 105, 180, 0.8)",
                  "0 0 20px rgba(255, 105, 180, 0.6)",
                ],
              }}
              className="flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 text-3xl shadow-2xl"
              transition={{
                duration: PULSE_DURATION,
                repeat: Number.POSITIVE_INFINITY,
                ease: "easeInOut",
              }}
            >
              🧪
            </motion.div>

            {/* Pulsing glow effect */}
            <motion.div
              animate={{
                scale: [1, PULSE_SCALE, 1],
                opacity: [
                  GLOW_OPACITY_HIGH,
                  GLOW_OPACITY_LOW,
                  GLOW_OPACITY_HIGH,
                ],
              }}
              className="absolute inset-0 rounded-full"
              style={{
                background:
                  "radial-gradient(circle, rgba(255,215,0,0.3) 0%, transparent 70%)",
              }}
              transition={{
                duration: PULSE_DURATION,
                repeat: Number.POSITIVE_INFINITY,
                ease: "easeInOut",
              }}
            />
          </div>
        </motion.div>

        {/* Phase 4: Synthesis Text (2.5-3.5s) */}
        <motion.div
          animate={{ opacity: 1, y: 0 }}
          className="-translate-x-1/2 absolute top-3/4 left-1/2 transform"
          initial={{ opacity: 0, y: 20 }}
          transition={{
            delay: ANIMATION_DELAY_PHASE4,
            duration: ANIMATION_DURATION_PHASE4,
            ease: "easeOut",
          }}
        >
          <div className="bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-center font-bold text-2xl text-transparent">
            Heimerdinger Synthesizing...
          </div>
        </motion.div>

        {/* Phase 5: Eureka Moment (5-7s) */}
        <motion.div
          animate={{
            scale: [0, EUREKA_SCALE, 1],
            opacity: [0, 1, 0],
          }}
          className="pointer-events-none absolute inset-0 flex items-center justify-center"
          initial={{ scale: 0, opacity: 0 }}
          transition={{
            duration: ANIMATION_DURATION_PHASE5,
            delay: ANIMATION_DELAY_PHASE5,
            times: EUREKA_TIMES,
            ease: "easeInOut",
          }}
        >
          <div className="text-6xl drop-shadow-lg filter">✨</div>
        </motion.div>

        {/* Additional sparkle effects for Eureka moment */}
        <motion.div
          animate={{ opacity: [0, 1, 0] }}
          className="pointer-events-none absolute inset-0"
          initial={{ opacity: 0 }}
          transition={{
            duration: ANIMATION_DURATION_PHASE5,
            delay: ANIMATION_DELAY_PHASE5,
            ease: "easeInOut",
          }}
        >
          {[...new Array(SPARKLE_COUNT)].map((_, i) => {
            const angle = (TWO_PI / SPARKLE_COUNT) * i;
            const distance = SPARKLE_DISTANCE;
            const sparkleId = `sparkle-${Math.round(angle * ANGLE_MULTIPLIER)}`;
            return (
              <motion.div
                animate={{
                  scale: [0, 1, 0],
                  rotate: [0, ROTATION_DEGREES],
                  opacity: [0, 1, 0],
                }}
                className="absolute text-2xl"
                initial={{ scale: 0, rotate: 0 }}
                key={sparkleId}
                style={{
                  left: "50%",
                  top: "50%",
                  marginLeft: Math.cos(angle) * distance,
                  marginTop: Math.sin(angle) * distance,
                }}
                transition={{
                  duration: SPARKLE_DURATION,
                  delay: ANIMATION_DELAY_PHASE5 + i * STAGGER_DELAY,
                  ease: "easeOut",
                }}
              >
                ✨
              </motion.div>
            );
          })}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
