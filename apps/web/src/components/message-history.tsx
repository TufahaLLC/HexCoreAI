import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type MessageHistoryProps = {
  messages: Array<{
    timestamp: number;
    status: string;
    message: string;
    agent?: string;
  }>;
};

export const MessageHistory = ({ messages }: MessageHistoryProps) => (
  <Card>
    <CardHeader>
      <CardTitle>Message History</CardTitle>
      <CardDescription>
        Real-time updates from the analysis pipeline
      </CardDescription>
    </CardHeader>
    <CardContent>
      <div className="max-h-96 space-y-2 overflow-y-auto">
        {messages.map((msg) => (
          <div
            className="border-l-2 border-l-muted py-2 pl-4 text-sm"
            key={`${msg.timestamp}-${msg.status}`}
          >
            <div className="font-medium">
              [{new Date(msg.timestamp).toLocaleTimeString()}] {msg.status}
            </div>
            <div className="text-muted-foreground">{msg.message}</div>
            {msg.agent && (
              <div className="mt-1 text-blue-600 text-xs">
                Agent: {msg.agent}
              </div>
            )}
          </div>
        ))}
      </div>
    </CardContent>
  </Card>
);
