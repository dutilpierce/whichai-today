import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import { Geist, Geist_Mono } from "next/font/google";
import { Aurora } from "@/components/Aurora";
import { JsonLd } from "@/components/JsonLd";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import site from "@/lib/site.json";
import "./globals.css";

const description =
  "Today's best AI model may not be tomorrow's. Find the top model right now for coding, writing, legal work, math, or speed, plus an alternative and an open-source pick, based on public benchmarks.";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const sameAs = [site.bluesky_url, site.telegram_url, site.github_url].filter(Boolean);

export const metadata: Metadata = {
  metadataBase: new URL("https://whichai.today"),
  title: {
    default: "Find the Best AI Model for the Job | WhichAI.today",
    template: "%s | WhichAI.today",
  },
  description,
  alternates: {
    canonical: "/",
    types: {
      "application/rss+xml": "https://whichai.today/feed.xml",
    },
  },
  openGraph: {
    title: "Find the best AI model for the job",
    description,
    url: "https://whichai.today",
    siteName: "WhichAI.today",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Find the best AI model for the job",
    description,
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body
        className="isolate min-h-full flex flex-col bg-zinc-950 font-sans text-zinc-50"
        style={{ backgroundColor: "#09090b", color: "#fafafa" }}
      >
        <Aurora />
        <JsonLd
          data={{
            "@context": "https://schema.org",
            "@graph": [
              {
                "@type": "WebSite",
                name: "WhichAI.today",
                url: "https://whichai.today",
                description,
              },
              {
                "@type": "WebApplication",
                name: "WhichAI.today",
                url: "https://whichai.today",
                applicationCategory: "ProductivityApplication",
                operatingSystem: "Any",
                offers: {
                  "@type": "Offer",
                  price: "0",
                  priceCurrency: "USD",
                },
                description,
              },
              {
                "@type": "Organization",
                name: "WhichAI.today",
                url: "https://whichai.today",
                logo: "https://whichai.today/icon-512.png",
                ...(sameAs.length ? { sameAs } : {}),
              },
            ],
          }}
        />
        <SiteHeader />
        {children}
        <SiteFooter includeChanges />
        <Analytics />
      </body>
    </html>
  );
}
