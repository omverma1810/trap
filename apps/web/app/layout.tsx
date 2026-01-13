import type { Metadata } from "next";
import "@/styles/globals.css";
import { QueryProvider } from "@/lib/api";

export const metadata: Metadata = {
  title: "TRAP Inventory System",
  description: "Enterprise-grade inventory management for luxury apparel",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-bg-primary text-text-primary antialiased">
        <QueryProvider>
          {children}
        </QueryProvider>
      </body>
    </html>
  );
}

