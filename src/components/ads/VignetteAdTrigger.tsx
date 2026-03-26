"use client";

import { useState, useEffect } from "react";
import VignetteAd from "./VignetteAd";

// 결과 페이지에서 0.5초 딜레이 후 Vignette 광고 표시
export function VignetteAdTrigger() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setShow(true), 500);
    return () => clearTimeout(timer);
  }, []);

  return <VignetteAd show={show} onClose={() => setShow(false)} />;
}
