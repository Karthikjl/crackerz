"use client";

import { useEffect } from "react";
import { withBase } from "@/basePath";

/** Registers the offline service worker in production builds. */
export default function PwaRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register(withBase("/sw.js"), { scope: withBase("/") }).catch(() => {});
  }, []);
  return null;
}
