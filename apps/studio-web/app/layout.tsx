import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FailSafe",
  description: "Crash-test AI agents before production does."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
