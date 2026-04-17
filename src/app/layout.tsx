import { AntdRegistry } from '@ant-design/nextjs-registry';
import { ConfigProvider } from 'antd';
import type { Metadata } from "next";
import type { CSSProperties } from 'react';
import "./globals.css";
import { MsalProvider } from "@/lib/msal-provider";
import { Toaster } from "@/components/ui/sonner";

const fontVars: CSSProperties = {
  ['--font-eng' as string]: '"Exo 2", "Segoe UI", "Roboto", "Helvetica Neue", Arial, sans-serif',
  ['--font-thai' as string]: '"Bai Jamjuree", "Noto Sans Thai", "Leelawadee UI", "TH Sarabun New", sans-serif',
};

export const metadata: Metadata = {
  title: "PTTSWP",
  description: "PTT Strategic Workforce Planning System",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="th"
      suppressHydrationWarning
      style={fontVars}
    >
      <body className="font-sans antialiased min-h-screen">
         <AntdRegistry>
          <ConfigProvider
            theme={{
              token: {
                fontFamily: 'var(--font-eng), var(--font-thai)',
              },
            }}
          >
            <MsalProvider>
                {children}
                <Toaster richColors position="top-right" />
            </MsalProvider>
          </ConfigProvider>
        </AntdRegistry>
      </body>
    </html>
  );
}
