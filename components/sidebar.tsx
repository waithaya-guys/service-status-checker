"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FaChartBar, FaCog, FaExclamationTriangle } from "react-icons/fa";
import { useLayoutContext } from "./layout-context";
import { Drawer, DrawerContent, DrawerBody, DrawerHeader } from "@heroui/drawer";
import { useEffect } from "react";

const menuItems = [
    { name: "Overview", href: "/", icon: FaChartBar },
    { name: "Incidents", href: "/incidents", icon: FaExclamationTriangle },
    { name: "Admin", href: "/admin", icon: FaCog },
];

export const Sidebar = () => {
    const pathname = usePathname();
    const { isIconOnly, isMobileOpen, setMobileOpen } = useLayoutContext();

    // Close mobile drawer on route change
    useEffect(() => {
        setMobileOpen(false);
    }, [pathname, setMobileOpen]);

    // Close mobile drawer on resize to desktop
    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth >= 768) {
                setMobileOpen(false);
            }
        };
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, [setMobileOpen]);

    const MenuList = () => (
        <div className="flex flex-col gap-2 px-2 py-4">
            {menuItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                    <Link
                        key={item.href}
                        href={item.href}
                        className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isActive
                            ? "bg-primary/20 text-primary font-medium"
                            : "hover:bg-content2 text-content3"
                            }`}
                    >
                        <Icon size={20} className="flex-shrink-0" />
                        <span>{item.name}</span>
                    </Link>
                );
            })}
        </div>
    );

    return (
        <>
            {/* Desktop Sidebar - Hidden on mobile */}
            <aside className={`hidden md:flex ${isIconOnly ? "w-20" : "w-64"} h-screen bg-content1 flex-col border-r border-content2 transition-all duration-300 relative`}>

                {/* Header */}
                <div className={`h-16 flex items-center ${isIconOnly ? "justify-center" : "px-6"} border-b border-content2 overflow-hidden whitespace-nowrap`}>
                    {isIconOnly ? (
                        <span className="text-xl font-bold text-primary">S</span>
                    ) : (
                        <h1 className="text-2xl font-bold text-primary">Service Status</h1>
                    )}
                </div>

                {/* Menu */}
                <div className="flex-1 py-4 flex flex-col gap-2 px-2">
                    {menuItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = pathname === item.href;
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isActive
                                    ? "bg-primary/20 text-primary font-medium"
                                    : "hover:bg-content2 text-content3"
                                    } ${isIconOnly ? "justify-center" : ""}`}
                                title={isIconOnly ? item.name : undefined}
                            >
                                <Icon size={20} className="flex-shrink-0" />
                                {!isIconOnly && <span>{item.name}</span>}
                            </Link>
                        );
                    })}
                </div>
            </aside>

            {/* Mobile Drawer - Hidden on desktop */}
            <Drawer
                isOpen={isMobileOpen}
                onOpenChange={setMobileOpen}
                placement="left"
                backdrop="blur"
                classNames={{
                    base: "bg-content1",
                }}
            >
                <DrawerContent>
                    {(onClose) => (
                        <>
                            <DrawerHeader className="flex flex-col gap-1 border-b border-content2 h-16 justify-center">
                                <h1 className="text-2xl font-bold text-primary">Service Status</h1>
                            </DrawerHeader>
                            <DrawerBody className="p-0">
                                <MenuList />
                            </DrawerBody>
                        </>
                    )}
                </DrawerContent>
            </Drawer>
        </>
    );
};
