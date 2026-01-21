"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";

interface LayoutContextType {
    isIconOnly: boolean;
    toggleSidebar: () => void;
    isMobileOpen: boolean;
    setMobileOpen: (open: boolean) => void;
}

const LayoutContext = createContext<LayoutContextType | undefined>(undefined);

export const LayoutProvider = ({ children }: { children: ReactNode }) => {
    const [isIconOnly, setIsIconOnly] = useState(true);
    const [isMobileOpen, setMobileOpen] = useState(false);

    const toggleSidebar = () => {
        setIsIconOnly(prev => !prev);
    };

    return (
        <LayoutContext.Provider value={{ isIconOnly, toggleSidebar, isMobileOpen, setMobileOpen }}>
            {children}
        </LayoutContext.Provider>
    );
};

export const useLayoutContext = () => {
    const context = useContext(LayoutContext);
    if (!context) {
        throw new Error("useLayoutContext must be used within a LayoutProvider");
    }
    return context;
};
