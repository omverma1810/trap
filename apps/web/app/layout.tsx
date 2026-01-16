import type { Metadata } from "next";
import "@/styles/globals.css";
import { QueryProvider } from "@/lib/api";

export const metadata: Metadata = {
  title: "TRAP Inventory System",
  description: "Enterprise-grade inventory management for luxury apparel",
};

// Script to apply theme before React hydrates to prevent flash
const themeScript = `
  (function() {
    try {
      const stored = localStorage.getItem('trap-theme');
      let theme = 'dark';
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (parsed.state && parsed.state.theme) {
            theme = parsed.state.theme;
          }
        } catch (e) {
          // Fallback if not JSON
          if (stored === 'light') theme = 'light';
        }
      }
      document.documentElement.setAttribute('data-theme', theme);
    } catch (e) {
      document.documentElement.setAttribute('data-theme', 'dark');
    }
  })();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-screen bg-bg-primary text-text-primary antialiased">
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}
