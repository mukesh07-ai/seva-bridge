import type { Metadata } from "next";
import { Inter, Outfit } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const outfit = Outfit({ subsets: ["latin"], variable: "--font-outfit" });

export const metadata: Metadata = {
  title: { default: "Seva-Bridge | Post-Discharge Healthcare Platform", template: "%s | Seva-Bridge" },
  description: "Connecting patients with verified medical volunteers for post-discharge home healthcare. Find qualified medical volunteers near you.",
  keywords: ["healthcare", "home care", "medical volunteers", "post-discharge", "seva"],
  openGraph: {
    title: "Seva-Bridge",
    description: "Post-Discharge Healthcare Platform",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${outfit.variable}`}>
      <body className="font-sans bg-surface text-slate-900 antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
