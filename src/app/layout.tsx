import type { Metadata } from "next";
import "./globals.css";
import AIChatDrawer from "@/components/AIChatDrawer";

export const metadata: Metadata = {
  title: "ប្រព័ន្ធកត់វត្តមានសិស្ស | Student Attendance via Google Sheet",
  description: "ប្រព័ន្ធគ្រប់គ្រងវត្តមានសិស្ស និងចុះឈ្មោះសិស្សផ្ទុកទិន្នន័យត្រង់ចូល Google Sheet ដោយស្វ័យប្រវត្តិ",
  icons: {
    icon: [
      { url: "/images/app-logo.png", sizes: "any" },
      { url: "/images/app-logo.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [
      { url: "/images/app-logo.png", sizes: "180x180", type: "image/png" },
    ],
    shortcut: "/images/app-logo.png",
  },
  manifest: "/manifest.json",
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
      </head>
      <body className="min-h-screen flex flex-col bg-slate-50 text-slate-900" suppressHydrationWarning>
        {children}
        <AIChatDrawer />
      </body>
    </html>
  );
}
