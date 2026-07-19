import type React from "react";
import { SectionHeader } from "@/shared/ui/SectionHeader";
import { PageSkeleton } from "@/shared/ui/PageSkeleton";

export default function Loading(): React.JSX.Element {
  return (
    <>
      <SectionHeader title="Deudas" />
      <PageSkeleton />
    </>
  );
}
