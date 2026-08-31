import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sahara",
  description: "Anonymous peer support platform",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang='en'
      className='h-full antialiased'
    >
      <body className='min-h-full flex flex-col font-sans'>{children}</body>
    </html>
  );
}
