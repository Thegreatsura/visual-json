import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "visual-json",
  description: "The visual JSON editor",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark h-full">
      <body className="h-full">{children}</body>
    </html>
  );
}
