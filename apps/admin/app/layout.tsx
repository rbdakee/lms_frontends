import type { Metadata, Viewport } from "next";
import { Manrope } from "next/font/google";
import "@lms/ui/globals.css";
import "@lms/ui/admin.css";
import { MeProvider } from "@lms/api";
import { StoreProvider } from "@lms/prototype";
import { ToastHost } from "@lms/prototype/ToastHost";

/**
 * Тот же Manrope, что и в клиентском приложении. Настройка повторяется здесь,
 * потому что `next/font` работает внутри приложения и в общий пакет не выносится;
 * менять шрифт нужно в двух местах сразу.
 */
const manrope = Manrope({
  subsets: ["latin", "cyrillic", "cyrillic-ext"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-manrope",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Админка · LMS для учителей",
  description: "Заявки, доступы, проверка работ и содержимое курсов.",
  /* Админка не индексируется: она про телефоны и ФИО учителей, а не про каталог */
  robots: { index: false, follow: false },
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
        <MeProvider>
          <StoreProvider>
            {children}
            <ToastHost />
          </StoreProvider>
        </MeProvider>
      </body>
    </html>
  );
}
