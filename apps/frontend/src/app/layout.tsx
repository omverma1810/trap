import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "Trap Inventory | Luxury Streetwear Management",
  description: "Enterprise-grade inventory management for luxury streetwear brands",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="light" style={{ background: '#f8f9fa' }}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link 
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" 
          rel="stylesheet" 
        />
      </head>
      <body 
        className="antialiased" 
        style={{ 
          background: '#f8f9fa', 
          backgroundImage: 'none',
          margin: 0,
          padding: 0
        }}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
