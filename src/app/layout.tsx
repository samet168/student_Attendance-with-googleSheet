import type { Metadata } from "next";
import "./globals.css";
import AIChatDrawer from "@/components/AIChatDrawer";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";

export const metadata: Metadata = {
  title: "ប្រព័ន្ធកត់វត្តមានសិស្ស | Student Attendance via Google Sheet",
  description: "ប្រព័ន្ធគ្រប់គ្រងវត្តមានសិស្ស និងចុះឈ្មោះសិស្សផ្ទុកទិន្នន័យត្រង់ចូល Google Sheet ដោយស្វ័យប្រវត្តិ",
  applicationName: "វត្តមានសិស្ស",
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { url: "/app-logo.png", sizes: "256x256", type: "image/png" },
      { url: "/favicon.ico", sizes: "any" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    shortcut: "/icon-192.png",
  },
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "វត្តមានសិស្ស",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="km" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
        <meta name="theme-color" content="#10b981" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="វត្តមានសិស្ស" />
        <meta name="application-name" content="វត្តមានសិស្ស" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <link rel="apple-touch-icon-precomposed" href="/apple-touch-icon-precomposed.png" />
        <link rel="icon" type="image/png" sizes="192x192" href="/icon-192.png" />
        <link rel="icon" type="image/png" sizes="512x512" href="/icon-512.png" />
        <link rel="icon" type="image/png" sizes="256x256" href="/app-logo.png" />
        <link rel="shortcut icon" href="/icon-192.png" />
        <link rel="manifest" href="/manifest.webmanifest" />
      </head>
      <body className="min-h-screen flex flex-col bg-slate-50 text-slate-900" suppressHydrationWarning>
        {children}
        <AIChatDrawer />
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
