import type { Metadata } from "next";
import "./globals.css";
import { TrpcProvider } from "@/components/providers/TrpcProvider";
import { SessionProvider } from "@/components/providers/SessionProvider";

export const metadata: Metadata = {
  title: "DevPortal",
  description: "Enterprise API Developer Portal",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <SessionProvider>
          <TrpcProvider>{children}</TrpcProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
