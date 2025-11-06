import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "../index.css";
import FloatingSettings from "@/components/floating-settings";
import Providers from "@/components/providers";
import { WebSocketProvider } from "@/contexts/web-socket-context";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "hexcore-ai",
  description: "hexcore-ai",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <WebSocketProvider>
          <Providers>
            <FloatingSettings />
            {children}
          </Providers>
        </WebSocketProvider>
      </body>
    </html>
  );
}
