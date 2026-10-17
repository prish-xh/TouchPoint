import type { Metadata, Viewport } from "next";
import "@fontsource/atkinson-hyperlegible/400.css";
import "@fontsource/atkinson-hyperlegible/700.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "Touchpoint",
  description: "Any appliance, your way. Touchpoint guides your finger to the right button and checks each press.",
  applicationName: "Touchpoint",
  appleWebApp: { capable: true, title: "Touchpoint", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#FFF7EE",
};

// Applies the saved theme before first paint, so high-contrast users never see a flash of the warm theme.
const themeScript = `try{var t=localStorage.getItem("touchpoint-theme");if(t==="contrast"||(!t&&matchMedia("(prefers-contrast: more)").matches)){document.documentElement.dataset.theme="contrast"}}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-dvh antialiased">{children}</body>
    </html>
  );
}
