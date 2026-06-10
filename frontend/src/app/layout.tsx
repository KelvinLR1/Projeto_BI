import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AlertProvider } from "@/context/AlertContext";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "HUB BI",
  description: "Plataforma de Business Intelligence",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className={`${inter.variable} antialiased`}>
        <AlertProvider>
          {children}
        </AlertProvider>
      </body>
    </html>
  );
}
