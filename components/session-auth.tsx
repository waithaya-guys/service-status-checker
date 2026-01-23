"use client";

import { useSession, signIn } from "next-auth/react";
import { useEffect } from "react";

export const SessionAuth = ({ children }: { children: React.ReactNode }) => {
    const { data: session } = useSession();

    useEffect(() => {
        if (session?.error === "RefreshAccessTokenError") {
            signIn("keycloak"); // Redirect to sign in page
        }
    }, [session]);

    return <>{children}</>;
};
