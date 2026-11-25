import "./globals.css";
import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "Nadlan Tours | Smart Travel",
  description: "Nadlan Tours booking management and travel assistant"
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ar" dir="rtl"><body>{children}</body></html>;
}
