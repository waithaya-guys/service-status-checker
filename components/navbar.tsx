"use client";

import { ThemeSwitch } from "./theme-switch";
import { useSession, signIn, signOut } from "next-auth/react";
import { Button } from "@heroui/button";
import { Navbar as HeroNavbar, NavbarBrand, NavbarContent, NavbarItem } from "@heroui/navbar";
import Link from "next/link";

import { NotificationBell } from "@/components/notification-bell";
import { useLayoutContext } from "@/components/layout-context";
import { FaBars } from "react-icons/fa";

export const Navbar = () => {
    const { data: session } = useSession();
    const { toggleSidebar, setMobileOpen, isMobileOpen } = useLayoutContext();

    const handleToggle = () => {
        if (window.innerWidth < 768) {
            setMobileOpen(!isMobileOpen);
        } else {
            toggleSidebar();
        }
    };

    const handleLogout = async () => {
        // 1. Sign out from NextAuth (clears local session)
        await signOut({ redirect: false, callbackUrl: "/" });

        // 2. Redirect to Keycloak Logout to clear SSO session
        window.location.href = "/api/auth/federated-logout";
    };

    return (
        <HeroNavbar maxWidth="full" position="sticky" isBlurred>
            <NavbarContent justify="start">
                <NavbarItem>
                    <Button isIconOnly variant="light" onPress={handleToggle}>
                        <FaBars size={20} />
                    </Button>
                </NavbarItem>
                <NavbarBrand className="hidden md:flex">
                    <h2 className="text-xl font-bold text-inherit">Service Status Checker</h2>
                </NavbarBrand>
            </NavbarContent>

            <NavbarContent justify="end" className="gap-4">
                {session ? (
                    <>
                        <NavbarItem className="hidden md:flex">
                            <span className="text-small">Hello, {session.user?.name || "Admin"}</span>
                        </NavbarItem>
                        <NavbarItem className="hidden md:flex">
                            <Button size="sm" variant="flat" as={Link} href="/admin">
                                Admin
                            </Button>
                        </NavbarItem>
                        <NavbarItem>
                            <Button size="sm" color="danger" variant="flat" onPress={handleLogout}>
                                Logout
                            </Button>
                        </NavbarItem>
                    </>
                ) : (
                    <NavbarItem>
                        <Button size="sm" color="primary" variant="flat" onPress={() => signIn("keycloak")}>
                            Login
                        </Button>
                    </NavbarItem>
                )}

                <NavbarItem>
                    <NotificationBell />
                </NavbarItem>

                <NavbarItem>
                    <ThemeSwitch />
                </NavbarItem>
            </NavbarContent>
        </HeroNavbar>
    );
};
