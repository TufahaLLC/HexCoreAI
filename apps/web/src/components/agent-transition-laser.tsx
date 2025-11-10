"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

type AgentTransitionLaserProps = {
  isActive: boolean;
  laserColor: string;
  toAgent: string;
  onTransitionComplete?: () => void;
};

const LASER_DURATION = 1200;
const LASER_MAIN_HEIGHT = 8;
const LASER_SECONDARY_HEIGHT = 4;
const IMPACT_FLASH_SIZE = 100;
const TRANSITION_TEXT_OFFSET = 20;
const TRANSITION_INITIAL_DELAY = 0.1;
const IMPACT_FLASH_DELAY = 0.4;
const IMPACT_FLASH_DURATION = 0.8;
const LASER_CONTAINER_WIDTH = 200;
const SECONDARY_BEAM_OPACITY = 0.6;
const FADE_DURATION = 0.2;
const LASER_ANIMATION_DURATION = 1.2;
const TRANSITION_Y_START = 20;
const TRANSITION_Y_END = -20;
const BOX_SHADOW_BLUR_1 = 20;
const BOX_SHADOW_BLUR_2 = 40;
const IMPACT_FLASH_SCALE_1 = 2;
const IMPACT_FLASH_SCALE_2 = 3;
const IMPACT_FLASH_OPACITY_MIN = 0;
const IMPACT_FLASH_OPACITY_MAX = 0.8;
const LASER_BEAM_OPACITY_MIN = 0;
const LASER_BEAM_OPACITY_MAX = 1;
const TEXT_OPACITY_MIN = 0;
const TEXT_OPACITY_MAX = 1;
const BACKGROUND_ALPHA = "20";
const BORDER_WIDTH = 2;
const TEXT_BOX_SHADOW_BLUR = 20;
const TEXT_BOX_SHADOW_ALPHA = "40";

export function AgentTransitionLaser({
  isActive,
  laserColor,
  toAgent,
  onTransitionComplete,
}: AgentTransitionLaserProps) {
  const [showLaser, setShowLaser] = useState(false);

  useEffect(() => {
    if (!isActive) {
      return;
    }

    setShowLaser(true);
    const timer = setTimeout(() => {
      setShowLaser(false);
      onTransitionComplete?.();
    }, LASER_DURATION);

    return () => {
      clearTimeout(timer);
    };
  }, [isActive, onTransitionComplete]);

  return (
    <AnimatePresence>
      {showLaser && (
        <motion.div
          animate={{ opacity: 1 }}
          className={cn(
            "pointer-events-none absolute inset-0 z-40 flex items-center justify-center"
          )}
          exit={{ opacity: 0 }}
          initial={{ opacity: 0 }}
          transition={{ duration: FADE_DURATION }}
        >
          {/* Laser beam shooting through hexagon */}
          <motion.div
            animate={{
              x: "100%",
              opacity: [
                LASER_BEAM_OPACITY_MIN,
                LASER_BEAM_OPACITY_MAX,
                LASER_BEAM_OPACITY_MAX,
                LASER_BEAM_OPACITY_MIN,
              ],
            }}
            className="absolute"
            initial={{ x: "-100%", opacity: 0 }}
            style={{
              width: `${LASER_CONTAINER_WIDTH}%`,
              height: `${LASER_MAIN_HEIGHT}px`,
              background: `linear-gradient(90deg, transparent, ${laserColor}, transparent)`,
              boxShadow: `0 0 ${BOX_SHADOW_BLUR_1}px ${laserColor}, 0 0 ${BOX_SHADOW_BLUR_2}px ${laserColor}`,
            }}
            transition={{
              duration: LASER_ANIMATION_DURATION,
              ease: "easeInOut",
            }}
          />

          {/* Secondary beam */}
          <motion.div
            animate={{
              x: "100%",
              opacity: [
                LASER_BEAM_OPACITY_MIN,
                SECONDARY_BEAM_OPACITY,
                SECONDARY_BEAM_OPACITY,
                LASER_BEAM_OPACITY_MIN,
              ],
            }}
            className="absolute"
            initial={{ x: "-100%", opacity: 0 }}
            style={{
              width: `${LASER_CONTAINER_WIDTH}%`,
              height: `${LASER_SECONDARY_HEIGHT}px`,
              background: `linear-gradient(90deg, transparent, ${laserColor}80, transparent)`,
            }}
            transition={{
              duration: LASER_ANIMATION_DURATION,
              ease: "easeInOut",
              delay: TRANSITION_INITIAL_DELAY,
            }}
          />

          {/* Impact flash */}
          <motion.div
            animate={{
              opacity: [
                IMPACT_FLASH_OPACITY_MIN,
                IMPACT_FLASH_OPACITY_MAX,
                IMPACT_FLASH_OPACITY_MIN,
              ],
              scale: [0, IMPACT_FLASH_SCALE_1, IMPACT_FLASH_SCALE_2],
            }}
            className="absolute rounded-full"
            initial={{ scale: 0, opacity: 0 }}
            style={{
              width: `${IMPACT_FLASH_SIZE}px`,
              height: `${IMPACT_FLASH_SIZE}px`,
              background: `radial-gradient(circle, ${laserColor}, transparent)`,
            }}
            transition={{
              duration: IMPACT_FLASH_DURATION,
              delay: IMPACT_FLASH_DELAY,
            }}
          />

          {/* Agent transition text */}
          <motion.div
            animate={{
              opacity: [
                TEXT_OPACITY_MIN,
                TEXT_OPACITY_MAX,
                TEXT_OPACITY_MAX,
                TEXT_OPACITY_MIN,
              ],
              y: [TRANSITION_Y_START, 0, 0, TRANSITION_Y_END],
            }}
            className="-translate-x-1/2 -translate-y-1/2 absolute top-1/2 left-1/2"
            initial={{ opacity: TEXT_OPACITY_MIN, y: TRANSITION_TEXT_OFFSET }}
            transition={{ duration: LASER_ANIMATION_DURATION }}
          >
            <div
              className="rounded-lg px-4 py-2 font-bold text-lg backdrop-blur-sm"
              style={{
                color: laserColor,
                backgroundColor: `${laserColor}${BACKGROUND_ALPHA}`,
                border: `${BORDER_WIDTH}px solid ${laserColor}`,
                boxShadow: `0 0 ${TEXT_BOX_SHADOW_BLUR}px ${laserColor}${TEXT_BOX_SHADOW_ALPHA}`,
              }}
            >
              {toAgent} Activating...
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
