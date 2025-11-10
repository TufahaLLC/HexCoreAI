"use client";

import { Settings } from "lucide-react";
import { ModeToggle } from "@/components/mode-toggle";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export default function FloatingSettings() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          className={cn(
            "fixed",
            "right-4",
            "top-4",
            "z-50",
            "h-11",
            "w-11",
            "rounded-md",
            "shadow-lg",
            "transition",
            "hover:bg-background/80"
          )}
          size="icon"
          variant="ghost"
        >
          <Settings aria-hidden className="h-5 w-5" />
          <span className="sr-only">Open settings</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
        </DialogHeader>
        <div
          className={cn(
            "flex",
            "items-center",
            "justify-between",
            "rounded-md",
            "border",
            "border-border/60",
            "bg-muted/30",
            "px-4",
            "py-3"
          )}
        >
          <div className="space-y-1">
            <p className={cn("text-sm", "font-medium", "leading-none")}>
              Theme
            </p>
            <p className={cn("text-sm", "text-muted-foreground")}>
              Select your preferred appearance.
            </p>
          </div>
          <ModeToggle />
        </div>
      </DialogContent>
    </Dialog>
  );
}
