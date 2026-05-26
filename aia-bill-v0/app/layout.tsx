import type { Metadata } from "next";
import { Figtree } from "next/font/google";
import "./globals.css";
import { ToastProvider } from "@/components/ui/Toast";
import { TooltipProvider } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

const figtree = Figtree({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "AI Accountant Admin",
  description: "Billing and access operations portal for the AI Accountant growth and customer success teams.",
  icons: {
    icon: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning className={cn("min-h-screen", "font-sans", figtree.variable)}>
      <head />
      <body
        suppressHydrationWarning
        className={`${figtree.variable} m-0 min-h-screen font-sans antialiased`}
      >
        <TooltipProvider>
          <ToastProvider>{children}</ToastProvider>
        </TooltipProvider>
      </body>
    </html>
  );
}
