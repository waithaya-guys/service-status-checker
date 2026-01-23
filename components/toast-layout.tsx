"use client";

import { ToastProvider } from "@heroui/toast";
import { useEffect, useState } from "react";

export function ToastLayout() {
    const [placement, setPlacement] = useState<"top-center" | "bottom-left">("bottom-left");

    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth < 768) {
                setPlacement("top-center");
            } else {
                setPlacement("bottom-left");
            }
        };

        // Initial check
        handleResize();

        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    return <ToastProvider placement={placement} />;
}
