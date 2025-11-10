"use client";

import { motion } from "motion/react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { AnalysisFormData } from "@/types/analysis";

// Animation constants
const HEXCORE_ROTATION_DURATION = 2;
const ICON_SCALE_MAX = 1.1;
const ICON_SCALE_MIN = 1;
const CONTENT_FADE_DELAY = 0.1;
const CONTENT_INITIAL_Y_OFFSET = 10;
const SPINNER_ROTATION_DURATION = 1;
const ROTATION_START_DEGREES = 0;
const ROTATION_END_DEGREES = 360;

type AnalysisConfirmationDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  formData: AnalysisFormData | null;
  isConnecting: boolean;
};

export const AnalysisConfirmationDialog = ({
  open,
  onOpenChange,
  onConfirm,
  formData,
  isConnecting,
}: AnalysisConfirmationDialogProps) => {
  if (!formData) {
    return null;
  }

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <motion.div
              animate={{
                rotate: [ROTATION_START_DEGREES, ROTATION_END_DEGREES],
                scale: [ICON_SCALE_MIN, ICON_SCALE_MAX, ICON_SCALE_MIN],
              }}
              transition={{
                duration: HEXCORE_ROTATION_DURATION,
                repeat: Number.POSITIVE_INFINITY,
                ease: "linear",
              }}
            >
              <svg
                className="h-6 w-6 text-primary"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                viewBox="0 0 24 24"
              >
                <title>HexCore AI</title>
                <path
                  d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </motion.div>
            Initiate HexCore AI Analysis
          </DialogTitle>
          <DialogDescription className="pt-2 text-base">
            You are about to analyze the last year's games for{" "}
            <span className="font-semibold text-foreground">
              {formData.gameName}#{formData.tagLine}
            </span>{" "}
            in the <span className="font-semibold">{formData.region}</span>{" "}
            region.
          </DialogDescription>
        </DialogHeader>

        <motion.div
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4 py-4"
          initial={{ opacity: 0, y: CONTENT_INITIAL_Y_OFFSET }}
          transition={{ delay: CONTENT_FADE_DELAY }}
        >
          <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
            <h4 className="mb-2 font-semibold text-sm">Analysis Details:</h4>
            <ul className="space-y-1 text-muted-foreground text-sm">
              <li>• Year: {formData.year}</li>
              <li>• 11 specialized AI agents will analyze your gameplay</li>
              <li>• Processing time: 2-5 minutes</li>
              <li>• Real-time progress updates via HexTech visualization</li>
            </ul>
          </div>

          <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-4">
            <p className="text-amber-600 text-sm dark:text-amber-400">
              ⚠️ This process will analyze all matches from the selected year.
              Make sure your summoner information is correct.
            </p>
          </div>
        </motion.div>

        <DialogFooter className="gap-2">
          <Button
            disabled={isConnecting}
            onClick={() => onOpenChange(false)}
            type="button"
            variant="outline"
          >
            Cancel
          </Button>
          <Button
            className="gap-2"
            disabled={isConnecting}
            onClick={onConfirm}
            type="button"
          >
            {isConnecting ? (
              <>
                <motion.div
                  animate={{ rotate: ROTATION_END_DEGREES }}
                  className="h-4 w-4 rounded-full border-2 border-current border-t-transparent"
                  transition={{
                    duration: SPINNER_ROTATION_DURATION,
                    repeat: Number.POSITIVE_INFINITY,
                    ease: "linear",
                  }}
                />
                Initiating...
              </>
            ) : (
              <>
                <svg
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  viewBox="0 0 24 24"
                >
                  <title>Start</title>
                  <path
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                Start Analysis
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
