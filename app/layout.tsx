import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Upload Delivery Easy",
  description: "Automated delivery note filename generator using OCR + LLM",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
