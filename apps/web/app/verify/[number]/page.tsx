"use client";

/**
 * Результат проверки «/verify/:number» — раздел 5.12 брифа.
 * Сюда попадают по QR с бумажного сертификата или по скопированной ссылке:
 * результат показывается сразу, без формы и лишнего нажатия.
 */

import { useParams } from "next/navigation";
import { VerifyPanel } from "@/components/verify/VerifyPanel";

export default function VerifyByNumberPage() {
  const { number } = useParams<{ number: string }>();
  return <VerifyPanel preset={decodeURIComponent(number ?? "")} />;
}
