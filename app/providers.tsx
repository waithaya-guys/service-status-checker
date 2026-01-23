"use client";

import type { ThemeProviderProps } from "next-themes";

import * as React from "react";
import { HeroUIProvider } from "@heroui/system";
import { ToastProvider } from "@heroui/toast";
import { useRouter } from "next/navigation";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import { SessionProvider } from "next-auth/react";

export interface ProvidersProps {
  children: React.ReactNode;
  themeProps?: ThemeProviderProps;
}

import { LayoutProvider } from "@/components/layout-context";
import { SessionAuth } from "@/components/session-auth";
import { NotificationHandler } from "@/components/notification-handler";
import { ToastLayout } from "@/components/toast-layout";

declare module "@react-types/shared" {
  interface RouterConfig {
    routerOptions: NonNullable<
      Parameters<ReturnType<typeof useRouter>["push"]>[1]
    >;
  }
}

export function Providers({ children, themeProps }: ProvidersProps) {
  const router = useRouter();

  return (
    <SessionProvider>
      <SessionAuth>
        <HeroUIProvider navigate={router.push}>
          <NextThemesProvider {...themeProps}>
            <LayoutProvider>
              {children}
              <ToastLayout />
              <NotificationHandler />
            </LayoutProvider>
          </NextThemesProvider>
        </HeroUIProvider>
      </SessionAuth>
    </SessionProvider>
  );
}
