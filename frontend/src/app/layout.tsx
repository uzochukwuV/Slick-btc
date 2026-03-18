import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { WalletProvider } from "@/contexts/WalletContext";
import { NavigationHeader } from "@/components/layout/NavigationHeader";
import { Footer } from "@/components/layout/Footer";
import { Toaster } from "@/components/ui/sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://yieldr.xyz"),
  title: {
    default: "yieldr - AI-Powered sBTC Yield Optimization",
    template: "%s | yieldr",
  },
  description:
    "Maximize your Bitcoin yields with yieldr. AI-powered sBTC optimization across Stacks DeFi protocols. Secure, intelligent, and built on Bitcoin.",
  keywords: [
    "Bitcoin",
    "sBTC",
    "DeFi",
    "Yield",
    "Stacks",
    "AI",
    "Crypto",
    "Blockchain",
    "BTC",
    "Yield Farming",
  ],
  authors: [{ name: "yieldr Team" }],
  creator: "yieldr",
  publisher: "yieldr",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://yieldr.xyz",
    title: "yieldr - AI-Powered sBTC Yield Optimization",
    description:
      "Maximize your Bitcoin yields with AI-powered sBTC optimization on Stacks blockchain",
    siteName: "yieldr",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "yieldr - Bitcoin DeFi Yield Optimizer",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "yieldr - AI-Powered sBTC Yield Optimization",
    description:
      "Maximize your Bitcoin yields with AI-powered sBTC optimization",
    creator: "@yieldrhq",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon-16x16.png",
    apple: "/apple-touch-icon.png",
  },
  manifest: "/site.webmanifest",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`dark ${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <WalletProvider>
          <div className="flex min-h-screen flex-col">
            <NavigationHeader />
            <main className="flex-1">
              <div className="container mx-auto px-4 py-6 md:px-6 md:py-8">
                {children}
              </div>
            </main>
            <Footer />
          </div>
          <Toaster />
        </WalletProvider>
      </body>
    </html>
  );
}
