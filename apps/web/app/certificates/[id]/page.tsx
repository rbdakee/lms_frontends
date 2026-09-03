"use client";

/* Экран общий у обеих учебных площадок — он живёт в `@lms/site`.
   Здесь остаётся только маршрут: имя сегмента адреса у площадок своё. */

import { useParams } from "next/navigation";
import { CertificateScreen } from "@lms/site/screens/CertificateScreen";

export default function Page() {
  const { id } = useParams<{ id: string }>();
  return <CertificateScreen certificateId={id} />;
}
