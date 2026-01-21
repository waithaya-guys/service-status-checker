import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
    // Get the Keycloak Issuer from env
    const issuer = process.env.KEYCLOAK_ISSUER;
    const nextAuthUrl = process.env.NEXTAUTH_URL || req.headers.get("origin") || "http://localhost:3000";

    if (!issuer) {
        return NextResponse.redirect(new URL("/", req.url));
    }

    // Construct Keycloak Logout URL
    // Standard OIDC Logout: {issuer}/protocol/openid-connect/logout?post_logout_redirect_uri={redirectUri}
    const logoutUrl = `${issuer}/protocol/openid-connect/logout?post_logout_redirect_uri=${encodeURIComponent(nextAuthUrl)}`;

    return NextResponse.redirect(logoutUrl);
}
