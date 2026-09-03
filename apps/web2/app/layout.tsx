import type { Metadata, Viewport } from "next";
import { Rubik } from "next/font/google";
import "@lms/ui/globals.css";
/* Тема площадки идёт строго после дизайн-системы: она переопределяет её
   токены, и порядок подключения — это и есть механизм темы */
import "./theme.css";
import { MeProvider } from "@lms/api";
import { LangProvider } from "@lms/ui/lang";
import { ToastProvider } from "@lms/ui/toast";
import { BlockedGate } from "@lms/site";
import { BRAND } from "@/lib/brand";
import { CourseHost } from "@/components/layout/CourseHost";
import { SiteHost } from "@/components/layout/SiteHost";

/**
 * Rubik поддерживает кириллицу и казахские глифы (ә ғ қ ң ө ұ ү һ і) —
 * это обязательное требование брифа, и оно же ограничивает выбор гарнитуры.
 *
 * Шрифт у площадок разный намеренно: он замечается раньше цвета, и без него
 * «другая площадка» не читается никаким набором оттенков.
 */
const rubik = Rubik({
  subsets: ["latin", "cyrillic", "cyrillic-ext"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-rubik",
  display: "swap",
});

export const metadata: Metadata = {
  title: BRAND.ru.name,
  description:
    "Повышение квалификации онлайн: короткие видеоуроки на русском и казахском, тесты и сертификат с проверкой по номеру.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  /* Цвет строки браузера — метаданные Next, а не CSS: `var()` туда
     не доходит, поэтому значение стоит числом и повторяет `--bg` темы */
  themeColor: "#ffffff",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" className={rubik.variable}>
      <body>
        <MeProvider>
          <LangProvider>
            <ToastProvider>
              <CourseHost>
                <SiteHost>
                  <BlockedGate>{children}</BlockedGate>
                </SiteHost>
              </CourseHost>
            </ToastProvider>
          </LangProvider>
        </MeProvider>
      </body>
    </html>
  );
}
