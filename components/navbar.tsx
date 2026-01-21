"use client";

import { ThemeSwitch } from "./theme-switch";
import { useSession, signIn, signOut } from "next-auth/react";
import { Button } from "@heroui/button";
import Link from "next/link";

import { NotificationBell } from "@/components/notification-bell";
import { useLayoutContext } from "@/components/layout-context";
import { FaBars } from "react-icons/fa";

export const Navbar = () => {
    const { data: session } = useSession();
    const { toggleSidebar, setMobileOpen, isMobileOpen } = useLayoutContext();

    const handleToggle = () => {
        // Simple logic: if window width is small, toggle mobile drawer.
        // Ideally we check media query, but for now we can toggle both or separate based on CSS logic.
        // Actually, let's just trigger both state changes or check screen width. 
        // A better approach in React is often checking media query hook, but let's keep it simple:
        // We will toggle desktop sidebar state always (which affects desktop width) 
        // AND toggle mobile state (which opens drawer).
        // BUT, on desktop we don't want to open drawer.
        // Use a simple hidden md:block for separating buttons? Or verify media query.

        // Let's rely on the CSS of the components to react to state.
        // But the Sidebar component needs to know WHICH one to show.

        // Let's dispatch "toggleSidebar" for desktop and "setMobileOpen" for mobile.
        // Checking window.innerWidth is risky in SSR.
        // Let's update `handleToggle` to just call `toggleSidebar` which we might rename to `toggleDesktop`?

        // Better: two buttons? Or one button that does different things?
        // Let's assume the button is visible on both.

        if (window.innerWidth < 768) {
            setMobileOpen(!isMobileOpen);
        } else {
            toggleSidebar();
        }
    };

    const handleLogout = async () => {
        // 1. Sign out from NextAuth (clears local session)
        const data = await signOut({ redirect: false, callbackUrl: "/" });

        // 2. Redirect to Keycloak Logout to clear SSO session
        window.location.href = "/api/auth/federated-logout";
    };

    return (
        <nav className="h-16 w-full flex items-center justify-between px-6 bg-content1 shadow-sm sticky top-0 z-50">
            <div className="flex items-center gap-4">
                <Button isIconOnly variant="light" onPress={handleToggle}>
                    <FaBars size={20} />
                </Button>
                {/* Placeholder for Breadcrumbs or Page Title */}
                <span className="text-small hidden md:block"><h2 className="text-xl font-bold">Service Status Checker</h2></span>
            </div>
            <div className="flex items-center gap-4">
                {session ? (
                    <>
                        <span className="text-small hidden md:block">Hello, {session.user?.name || "Admin"}</span>
                        <span className="text-small hidden md:block">
                            <Button size="sm" variant="flat" as={Link} href="/admin">
                                Admin
                            </Button>
                        </span>
                        <Button size="sm" color="danger" variant="flat" onPress={handleLogout}>
                            Logout
                        </Button>
                    </>
                ) : (
                    <Button size="sm" color="primary" variant="flat" onPress={() => signIn("keycloak")}>
                        Login
                    </Button>
                )}
                <NotificationBell />
                {/* Theme Switcher */}
                <ThemeSwitch />
            </div>
        </nav>
    );
};
