import type { Metadata } from "next";
import { Cairo, Fraunces, Outfit } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const display = Fraunces({
  variable: "--font-display",
  subsets: ["latin"],
});

const body = Outfit({
  variable: "--font-body",
  subsets: ["latin"],
});

const arabic = Cairo({
  variable: "--font-arabic",
  subsets: ["arabic", "latin"],
  weight: ["400", "600", "700"],
});

export const metadata: Metadata = {
  title: "Voyara — AI Travel Companion",
  description:
    "Chat with an expert AI fixer to plan journeys, map itineraries, and understand traveler intent.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable} ${arabic.variable} h-full`}>
      <body className="min-h-full antialiased">
        {children}
        <Toaster theme="light" position="top-center" />
      </body>
    </html>
  );
}
