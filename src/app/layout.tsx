import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Steven's Toolbox - Tools for Students & Developers",
  description: "Privacy-first, ad-free utilities for students, developers, and security learners, including private file sharing, hash verification, text diff, and more.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
