import type { Metadata, Viewport } from "next";
import { Hind, Yatra_One } from "next/font/google";
import PwaRegister from "@/components/PwaRegister";
import "./globals.css";

const yatra = Yatra_One({
  variable: "--font-yatra",
  weight: "400",
  subsets: ["latin"],
});

const hind = Hind({
  variable: "--font-hind",
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Crackerz - Burst Crackers Online",
  description: "Light sparklers, flower pots, chakkars, bombs, rockets and sky shells right in your browser.",
  appleWebApp: { capable: true, title: "Crackerz", statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = {
  themeColor: "#0b0619",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${yatra.variable} ${hind.variable} font-sans antialiased`}>
        {children}
        <PwaRegister />
      </body>
    </html>
  );
}
