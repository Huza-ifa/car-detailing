import type { Metadata, Viewport } from "next";
import { Bebas_Neue, Inter } from "next/font/google";
import Navbar from "@/components/Navbar";
import SmoothScroll from "@/components/SmoothScroll";
import { site } from "@/config/site";
import "./globals.css";

const display = Bebas_Neue({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-display",
  display: "swap",
});

const body = Inter({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(site.seo.url),
  title: {
    default: site.seo.title,
    template: `%s — ${site.brand.name}`,
  },
  description: site.seo.description,
  applicationName: site.brand.name,
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "/",
    siteName: site.brand.name,
    title: site.seo.title,
    description: site.seo.description,
    images: [
      {
        url: site.images.og.src,
        width: site.images.og.width,
        height: site.images.og.height,
        alt: site.images.og.alt,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: site.seo.title,
    description: site.seo.description,
    images: [site.images.og.src],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  themeColor: "#07090c",
  colorScheme: "dark",
  // Extends the dark page under the notch/home indicator so env(safe-area-*)
  // insets resolve and the nav/footer can pad around them.
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable}`}>
      <body className="bg-background font-sans text-ink antialiased">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-sm focus:bg-ink focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-background"
        >
          {site.ui.skipToContent}
        </a>

        <SmoothScroll>
          <Navbar />
          {children}
        </SmoothScroll>
      </body>
    </html>
  );
}
