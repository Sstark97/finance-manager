"use client";

import type React from "react";
import { ErrorScreen } from "@/shared/ui/ErrorScreen";

export interface AppErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function AppError({ error, reset }: AppErrorProps): React.JSX.Element {
  return <ErrorScreen error={error} onRetry={reset} />;
}
