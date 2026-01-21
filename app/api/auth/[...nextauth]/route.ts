import NextAuth, { NextAuthOptions } from "next-auth";
import KeycloakProvider from "next-auth/providers/keycloak";

const requiredEnvVars = [
    "KEYCLOAK_CLIENT_ID",
    "KEYCLOAK_CLIENT_SECRET",
    "KEYCLOAK_ISSUER",
];

const missingVars = requiredEnvVars.filter((key) => !process.env[key]);

if (missingVars.length > 0) {
    console.error(
        `❌ Missing required environment variables for Authentication: ${missingVars.join(
            ", "
        )}. Please create a .env.local file with these values.`
    );
}

import { JWT } from "next-auth/jwt";

async function refreshAccessToken(token: JWT) {
    try {
        const url = `${process.env.KEYCLOAK_ISSUER}/protocol/openid-connect/token`;
        const body = new URLSearchParams({
            client_id: process.env.KEYCLOAK_CLIENT_ID || "",
            client_secret: process.env.KEYCLOAK_CLIENT_SECRET || "",
            grant_type: "refresh_token",
            refresh_token: token.refreshToken || "",
        });

        const response = await fetch(url, {
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
            },
            method: "POST",
            body: body,
        });

        const refreshedTokens = await response.json();

        if (!response.ok) {
            throw refreshedTokens;
        }

        return {
            ...token,
            accessToken: refreshedTokens.access_token,
            accessTokenExpires: Date.now() + refreshedTokens.expires_in * 1000,
            refreshToken: refreshedTokens.refresh_token ?? token.refreshToken, // Fallback to old refresh token
        };
    } catch (error) {
        console.error("RefreshAccessTokenError", error);

        return {
            ...token,
            error: "RefreshAccessTokenError",
        };
    }
}

import { jwtDecode } from "jwt-decode";

// ... (keep authOptions export)

export const authOptions: NextAuthOptions = {
    providers: [
        KeycloakProvider({
            clientId: process.env.KEYCLOAK_CLIENT_ID || "placeholder-client-id",
            clientSecret: process.env.KEYCLOAK_CLIENT_SECRET || "placeholder-client-secret",
            issuer: process.env.KEYCLOAK_ISSUER || "http://localhost:8080/realms/placeholder",
        }),
    ],
    callbacks: {
        async jwt({ token, account }) {
            // Initial sign in
            if (account) {
                token.accessToken = account.access_token;
                token.refreshToken = account.refresh_token;
                token.accessTokenExpires = account.expires_at ? account.expires_at * 1000 : 0;

                // Decode token to get roles
                if (token.accessToken) {
                    try {
                        const decoded: any = jwtDecode(token.accessToken);
                        token.roles = decoded.realm_access?.roles || [];
                    } catch (error) {
                        console.error("Error decoding access token:", error);
                    }
                }

                return token;
            }

            // Return previous token if the access token has not expired yet
            if (token.accessTokenExpires && Date.now() < token.accessTokenExpires) {
                return token;
            }

            // Access token has expired, try to update it
            console.log("Access Token Expired, Refreshing...");
            return refreshAccessToken(token);
        },
        async session({ session, token }) {
            session.accessToken = token.accessToken;
            session.error = token.error;
            session.roles = token.roles;
            return session;
        }
    }
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
