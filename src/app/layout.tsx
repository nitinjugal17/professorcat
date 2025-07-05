import type { Metadata } from 'next';
import { GeistSans } from 'geist/font/sans';
// import { GeistMono } from 'geist/font/mono'; // Removed as it was causing a build error and not explicitly used.
import './globals.css';
import { Toaster } from "@/components/ui/toaster";

const geistSans = GeistSans;

export const metadata: Metadata = {
  title: 'Tiny Tales Weaver',
  description: 'Weave enchanting stories about a bustling world filled with tiny, adventurous cats and their amazing tales!',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable}`}>
      <body className="antialiased font-sans">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
