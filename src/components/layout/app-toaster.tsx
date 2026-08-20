"use client";

import { useEffect, useState } from "react";

import { Toaster } from "@/components/ui/sonner";

export function AppToaster() {
  const [mobile, setMobile] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 767px)");
    const sync = () => setMobile(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  return (
    <Toaster
      richColors
      position={mobile ? "bottom-center" : "top-right"}
      offset={mobile ? { bottom: 96 } : 16}
    />
  );
}
