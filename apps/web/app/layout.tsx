import type { Metadata, Viewport } from "next";
import { Manrope } from "next/font/google";
import "@lms/ui/globals.css";
import { StoreProvider } from "@lms/prototype";
import { ToastHost } from "@lms/prototype/ToastHost";
import { PreviewBar } from "@/components/layout/PreviewBar";

/**
 * Manrope поддерживает кириллицу и казахские глифы (ә ғ қ ң ө ұ ү һ і) —
 * это обязательное требование брифа.
 */
const manrope = Manrope({
  subsets: ["latin", "cyrillic", "cyrillic-ext"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-manrope",
  display: "swap",
});

export const metadata: Metadata = {
  title: "LMS для учителей Казахстана",
  description:
    "Повышение квалификации онлайн: короткие видеоуроки на русском и казахском, тесты и сертификат с проверкой по номеру.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#ffffff",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" className={manrope.variable}>
      <body>
        <StoreProvider>
          <PreviewBar />
          {children}
          <ToastHost />
        </StoreProvider>
      </body>
    </html>
  );
}
