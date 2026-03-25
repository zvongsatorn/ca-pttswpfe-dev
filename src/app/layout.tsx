import { AntdRegistry } from '@ant-design/nextjs-registry';
import { ConfigProvider } from 'antd';
import type { Metadata } from "next";
import { Bai_Jamjuree, Exo_2} from 'next/font/google';
import "./globals.css";
import { MsalProvider } from "@/lib/msal-provider";
const fonethai = Bai_Jamjuree({
  subsets: ['thai'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-thai',
  display: 'swap',
});

const fonteng = Exo_2({
  subsets: ['latin'],
  weight: ['300', '400', '700'],
  variable: '--font-eng',
  display: 'swap',
});

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
      className={`${fonteng.variable} ${fonethai.variable}`}
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
            </MsalProvider>
          </ConfigProvider>
        </AntdRegistry>
      </body>
    </html>
  );
}
