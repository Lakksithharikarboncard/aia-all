import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Korefi — AI Accountant",
  description: "AI-powered accounting platform for Indian businesses",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col bg-background text-foreground" suppressHydrationWarning>
        <Script id="cleanup-extensions" strategy="beforeInteractive">
          {`(function(){
  try {
    var d = document.documentElement;
    if (d.getAttribute("data-qb-installed") !== null) d.removeAttribute("data-qb-installed");
    if (d.getAttribute("suppresshydrationwarning") !== null) d.removeAttribute("suppresshydrationwarning");
  } catch(e) {}
})()`}
        </Script>
        {children}
      </body>
    </html>
  );
}
