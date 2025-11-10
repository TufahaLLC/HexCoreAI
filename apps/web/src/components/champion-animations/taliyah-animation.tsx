"use client";

import { motion } from "motion/react";

type ChampionAnimationProps = {
  isActive: boolean;
  progress: number;
};

// Animation constants for Taliyah's stoneweaving effects
const ROCK_COUNT = 5;
const ROCK_BASE_SIZE = 20;
const ROCK_MAX_SIZE = 40;
const ROCK_ANIMATION_DURATION = 2.5;
const ROCK_OPACITY_PEAK = 0.8;
const PATH_WIDTH = 3;
const PATH_LENGTH = 60;
const PATH_ANIMATION_DURATION = 3;
const TERRAIN_CRACK_COUNT = 8;
const TERRAIN_CRACK_WIDTH = 2;
const TERRAIN_CRACK_MAX_LENGTH = 30;
const TERRAIN_ANIMATION_DURATION = 2.8;
const ROCK_SCALE_MIN = 0.5;
const ROCK_SCALE_FINAL = 1;
const ROCK_OPACITY_MIN = 0;
const ROCK_OPACITY_END = 0.6;
const ROCK_ROTATION_MIN = 0;
const ROCK_ROTATION_MID = 180;
const ROCK_ROTATION_MAX = 360;
const ROCK_TOP_BASE = 15;
const ROCK_TOP_INCREMENT = 15;
const ROCK_LEFT_BASE = 10;
const ROCK_LEFT_INCREMENT = 15;
const ROCK_DELAY_BASE = 0.4;
const ROCK_INITIAL_SCALE = 0.5;
const ROCK_INITIAL_OPACITY = 0;
const PATH_COUNT = 3;
const PATH_OPACITY_MIN = 0;
const PATH_OPACITY_MAX = 0.8;
const PATH_OPACITY_END = 0.3;
const PATH_TOP_BASE = 30;
const PATH_TOP_INCREMENT = 20;
const PATH_LEFT_BASE = 20;
const PATH_LEFT_INCREMENT = 10;
const PATH_ROTATION_BASE = -15;
const PATH_ROTATION_INCREMENT = 10;
const PATH_DELAY_BASE = 0.6;
const PATH_INITIAL_WIDTH = 0;
const PATH_INITIAL_OPACITY = 0;
const CRACK_OPACITY_MIN = 0;
const CRACK_OPACITY_MAX = 0.7;
const CRACK_TOP_BASE = 10;
const CRACK_TOP_INCREMENT = 10;
const CRACK_LEFT_BASE = 60;
const CRACK_LEFT_INCREMENT = 5;
const CRACK_ROTATION_BASE = 45;
const CRACK_ROTATION_INCREMENT = 15;
const CRACK_DELAY_BASE = 0.3;
const CRACK_INITIAL_WIDTH = 0;
const CRACK_INITIAL_OPACITY = 0;
const FOCUS_SCALE_MIN = 1;
const FOCUS_SCALE_MAX = 1.2;
const FOCUS_OPACITY_MIN = 0.5;
const FOCUS_OPACITY_MAX = 0.9;
const FOCUS_SIZE = 60;
const FOCUS_DURATION = 2;
const POSITION_PERCENTAGE_50 = "50%";
const TRANSLATE_CENTER = "translate(-50%, -50%)";
const BOX_SHADOW_ROCK = "0 0 20px rgba(139, 69, 19, 0.5)";
const BOX_SHADOW_PATH = "0 0 10px rgba(210, 105, 30, 0.6)";
const BOX_SHADOW_FOCUS = "0 0 30px rgba(139, 69, 19, 0.8)";
const COLOR_ROCK = "#8B4513";
const COLOR_PATH = "#D2691E";
const COLOR_TERRAIN = "#654321";
const GRADIENT_FOCUS =
  "radial-gradient(circle, #8B4513 0%, #D2691E 50%, transparent 70%)";

export function TaliyahAnimation({
  isActive,
  progress: _progress,
}: ChampionAnimationProps) {
  if (!isActive) {
    return null;
  }

  return (
    <motion.div className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* Stoneweaving rock formations */}
      {Array.from({ length: ROCK_COUNT }, (_, i) => (
        <motion.div
          animate={{
            scale: [
              ROCK_SCALE_MIN,
              ROCK_MAX_SIZE / ROCK_BASE_SIZE,
              ROCK_SCALE_FINAL,
            ],
            opacity: [ROCK_OPACITY_MIN, ROCK_OPACITY_PEAK, ROCK_OPACITY_END],
            rotate: [ROCK_ROTATION_MIN, ROCK_ROTATION_MID, ROCK_ROTATION_MAX],
          }}
          className="absolute rounded-full"
          initial={{ scale: ROCK_INITIAL_SCALE, opacity: ROCK_INITIAL_OPACITY }}
          key={`taliyah-rock-${i}-position-${ROCK_TOP_BASE + i * ROCK_TOP_INCREMENT}-${ROCK_LEFT_BASE + i * ROCK_LEFT_INCREMENT}`}
          style={{
            backgroundColor: COLOR_ROCK,
            width: `${ROCK_BASE_SIZE}px`,
            height: `${ROCK_BASE_SIZE}px`,
            top: `${ROCK_TOP_BASE + i * ROCK_TOP_INCREMENT}%`,
            left: `${ROCK_LEFT_BASE + i * ROCK_LEFT_INCREMENT}%`,
            boxShadow: BOX_SHADOW_ROCK,
          }}
          transition={{
            duration: ROCK_ANIMATION_DURATION,
            delay: i * ROCK_DELAY_BASE,
            repeat: Number.POSITIVE_INFINITY,
            repeatType: "reverse",
          }}
        />
      ))}

      {/* Earth path creation */}
      {Array.from({ length: PATH_COUNT }, (_, i) => (
        <motion.div
          animate={{
            width: [PATH_INITIAL_WIDTH, PATH_LENGTH, PATH_LENGTH],
            opacity: [PATH_OPACITY_MIN, PATH_OPACITY_MAX, PATH_OPACITY_END],
          }}
          className="absolute"
          initial={{ width: PATH_INITIAL_WIDTH, opacity: PATH_INITIAL_OPACITY }}
          key={`taliyah-path-${i}-position-${PATH_TOP_BASE + i * PATH_TOP_INCREMENT}-${PATH_LEFT_BASE + i * PATH_LEFT_INCREMENT}`}
          style={{
            backgroundColor: COLOR_PATH,
            height: `${PATH_WIDTH}px`,
            top: `${PATH_TOP_BASE + i * PATH_TOP_INCREMENT}%`,
            left: `${PATH_LEFT_BASE + i * PATH_LEFT_INCREMENT}%`,
            transform: `rotate(${PATH_ROTATION_BASE + i * PATH_ROTATION_INCREMENT}deg)`,
            boxShadow: BOX_SHADOW_PATH,
          }}
          transition={{
            duration: PATH_ANIMATION_DURATION,
            delay: i * PATH_DELAY_BASE,
            repeat: Number.POSITIVE_INFINITY,
            repeatType: "reverse",
          }}
        />
      ))}

      {/* Terrain cracking effects */}
      {Array.from({ length: TERRAIN_CRACK_COUNT }, (_, i) => (
        <motion.div
          animate={{
            width: [
              CRACK_INITIAL_WIDTH,
              TERRAIN_CRACK_MAX_LENGTH,
              CRACK_INITIAL_WIDTH,
            ],
            opacity: [CRACK_OPACITY_MIN, CRACK_OPACITY_MAX, CRACK_OPACITY_MIN],
          }}
          className="absolute"
          initial={{
            width: CRACK_INITIAL_WIDTH,
            opacity: CRACK_INITIAL_OPACITY,
          }}
          key={`taliyah-crack-${i}-position-${CRACK_TOP_BASE + i * CRACK_TOP_INCREMENT}-${CRACK_LEFT_BASE + i * CRACK_LEFT_INCREMENT}`}
          style={{
            backgroundColor: COLOR_TERRAIN,
            height: `${TERRAIN_CRACK_WIDTH}px`,
            top: `${CRACK_TOP_BASE + i * CRACK_TOP_INCREMENT}%`,
            left: `${CRACK_LEFT_BASE + i * CRACK_LEFT_INCREMENT}%`,
            transform: `rotate(${CRACK_ROTATION_BASE + i * CRACK_ROTATION_INCREMENT}deg)`,
          }}
          transition={{
            duration: TERRAIN_ANIMATION_DURATION,
            delay: i * CRACK_DELAY_BASE,
            repeat: Number.POSITIVE_INFINITY,
          }}
        />
      ))}

      {/* Central stoneweaving focus */}
      <motion.div
        animate={{
          scale: [FOCUS_SCALE_MIN, FOCUS_SCALE_MAX, FOCUS_SCALE_MIN],
          opacity: [FOCUS_OPACITY_MIN, FOCUS_OPACITY_MAX, FOCUS_OPACITY_MIN],
        }}
        className="absolute rounded-full"
        style={{
          width: `${FOCUS_SIZE}px`,
          height: `${FOCUS_SIZE}px`,
          top: POSITION_PERCENTAGE_50,
          left: POSITION_PERCENTAGE_50,
          transform: TRANSLATE_CENTER,
          background: GRADIENT_FOCUS,
          boxShadow: BOX_SHADOW_FOCUS,
        }}
        transition={{
          duration: FOCUS_DURATION,
          repeat: Number.POSITIVE_INFINITY,
          repeatType: "reverse",
        }}
      />
    </motion.div>
  );
}
