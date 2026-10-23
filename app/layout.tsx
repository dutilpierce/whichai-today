import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import { Geist, Geist_Mono } from "next/font/google";
import { JsonLd } from "@/components/JsonLd";
import "./globals.css";

const description =
  "Find which AI model is best right now for coding, writing, legal work, math, or speed. WhichAI.today compares today's leaders, alternatives, and open-source options from live public benchmarks.";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://whichai.today"),
  title: {
    default: "Which AI Model Is Best Right Now? | WhichAI.today",
    template: "%s | WhichAI.today",
  },
  description,
  alternates: { canonical: "/" },
  openGraph: {
    title: "Which AI Model Is Best Right Now?",
    description,
    url: "https://whichai.today",
    siteName: "WhichAI.today",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Which AI Model Is Best Right Now?",
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
        className="min-h-full flex flex-col bg-zinc-950 font-sans text-zinc-50"
        style={{ backgroundColor: "#09090b", color: "#fafafa" }}
      >
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
            ],
          }}
        />
        {children}
        <Analytics />
      </body>
    </html>
  );
}
