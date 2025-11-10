import { Badge } from "@/components/ui/badge";

type ConnectionStatusProps = {
  status: string;
  isConnected: boolean;
  sessionId?: string | null;
  gameName?: string | null;
  tagLine?: string | null;
};

export const ConnectionStatus = ({
  status,
  isConnected,
  sessionId,
  gameName,
  tagLine,
}: ConnectionStatusProps) => (
  <div className="flex items-center justify-between text-sm">
    <div className="flex items-center gap-2">
      <span className="font-medium">Connection Status:</span>
      <Badge variant={isConnected ? "default" : "secondary"}>{status}</Badge>
    </div>
    {sessionId && gameName && tagLine && (
      <div className="text-muted-foreground text-xs">
        Session: {sessionId} | {gameName}#{tagLine}
      </div>
    )}
  </div>
);
