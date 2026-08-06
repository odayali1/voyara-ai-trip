import type { Metadata } from "next";
import { Fraunces, Outfit } from "next/font/google";
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
    <html lang="en" className={`${display.variable} ${body.variable} h-full`}>
      <body className="min-h-full antialiased">
        {children}
        <Toaster theme="dark" position="top-center" />
      </body>
    </html>
  );
}
