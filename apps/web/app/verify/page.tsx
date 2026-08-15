"use client";

/** Проверка сертификата «/verify» — ввод номера руками. */

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { VerifyPanel } from "@/components/verify/VerifyPanel";

function VerifyInner() {
  const params = useSearchParams();
  return <VerifyPanel preset={params.get("number") ?? ""} />;
}

export default function VerifyPage() {
  return (
    <Suspense fallback={null}>
      <VerifyInner />
    </Suspense>
  );
}
