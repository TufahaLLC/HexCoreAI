import { Circle } from "lucide-react";

type ConnectionStatusProps = {
  status: string;
  isConnected: boolean;
};

export const ConnectionStatus = ({
  status,
  isConnected,
}: ConnectionStatusProps) => (
  <div className="flex items-center gap-2">
    <Circle
      className={`h-3 w-3 ${isConnected ? "fill-green-500 text-green-500" : "fill-gray-400 text-gray-400"}`}
    />
    <span className="font-medium text-sm">{status}</span>
  </div>
);
