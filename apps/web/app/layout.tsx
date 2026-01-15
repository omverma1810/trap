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
      const savedTheme = localStorage.getItem('trap-theme');
      const root = document.documentElement;
      root.classList.remove('dark', 'light');
      
      if (savedTheme === 'light') {
        root.classList.add('light');
      } else if (savedTheme === 'system') {
        const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        root.classList.add(systemDark ? 'dark' : 'light');
      } else {
        root.classList.add('dark');
      }
    } catch (e) {
      document.documentElement.classList.add('dark');
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
