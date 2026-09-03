"use client";

/** Проверка сертификата «/verify» — ввод номера руками. */

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { VerifyScreen } from "@lms/site/screens/VerifyScreen";

function VerifyInner() {
  const params = useSearchParams();
  return <VerifyScreen preset={params.get("number") ?? ""} />;
}

export default function VerifyPage() {
  return (
    <Suspense fallback={null}>
      <VerifyInner />
    </Suspense>
  );
}
