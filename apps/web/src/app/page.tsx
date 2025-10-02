"use client";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const REGION_OPTIONS = [
  { label: "Americas", value: "americas" },
  { label: "Europe", value: "europe" },
  { label: "Asia", value: "asia" },
  { label: "SEA", value: "sea" },
];

export default function Home() {
  const [gameName, setGameName] = useState("");
  const [tagLine, setTagLine] = useState("");
  const [region, setRegion] = useState(REGION_OPTIONS[0]?.value ?? "americas");

  const selectedRegionLabel = useMemo(
    () =>
      REGION_OPTIONS.find((option) => option.value === region)?.label ??
      "Region",
    [region]
  );

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedGameName = gameName.trim();
    const trimmedTagLine = tagLine.trim();

    if (!trimmedGameName) {
      toast.error("Please enter a game name.");
      return;
    }

    if (!trimmedTagLine) {
      toast.error("Please enter a tag line.");
      return;
    }

    toast.success("Summoner ready", {
      description: `Game Name: ${trimmedGameName}\nTag Line: ${trimmedTagLine}\nRegion: ${selectedRegionLabel}`,
    });
  };

  return (
    <div className="min-h-dvh bg-background">
      <div className="container mx-auto flex min-h-dvh items-center justify-center px-4 py-20">
        <div className="grid w-full max-w-5xl gap-14 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] md:items-start md:gap-20">
          <div className="flex flex-col gap-5 text-center md:text-left">
            <h1 className="font-semibold text-3xl tracking-tight sm:text-5xl">
              HexCoreAI
            </h1>
            <p className="text-balance text-lg text-muted-foreground leading-relaxed">
              HexCoreAI is an AI-powered League of Legends companion that turns
              a full year of match history into personalized retrospectives,
              blending the League Developer API with AWS AI services to deliver
              authentic insights, coaching, and celebratory storytelling.
            </p>
          </div>
          <Card className="w-full max-w-lg border border-border/60 bg-card/95 shadow-xl backdrop-blur">
            <CardHeader>
              <CardTitle>Look up a summoner</CardTitle>
              <CardDescription>
                Enter the game name, tag line, and region you want to explore.
              </CardDescription>
            </CardHeader>
            <form onSubmit={handleSubmit}>
              <CardContent className="space-y-6">
                <div className="grid gap-2">
                  <Label htmlFor="game-name">Game name</Label>
                  <Input
                    autoComplete="off"
                    id="game-name"
                    onChange={(event) => setGameName(event.target.value)}
                    placeholder="e.g. SomePlayer"
                    value={gameName}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="tag-line">Tag line</Label>
                  <Input
                    autoComplete="off"
                    id="tag-line"
                    onChange={(event) => setTagLine(event.target.value)}
                    placeholder="e.g. NA1"
                    value={tagLine}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Region</Label>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        className="justify-between"
                        type="button"
                        variant="outline"
                      >
                        {selectedRegionLabel}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      align="start"
                      className="min-w-[12rem]"
                    >
                      {REGION_OPTIONS.map((option) => (
                        <DropdownMenuItem
                          data-state={
                            region === option.value ? "checked" : undefined
                          }
                          key={option.value}
                          onSelect={() => setRegion(option.value)}
                        >
                          {option.label}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardContent>
              <CardFooter className="mt-4">
                <Button className="w-full" type="submit">
                  Submit
                </Button>
              </CardFooter>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
}
