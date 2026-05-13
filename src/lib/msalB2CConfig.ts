import { Configuration, PublicClientApplication } from "@azure/msal-browser";
import { getSafeWindowOrigin } from "@/utils/security";

// Standard B2C User Flow Policy Name
// Often named B2C_1_susi or B2C_1_signin. 
// Can be overridden by environment variable if different.
export const b2cPolicies = {
    names: {
        signIn: process.env.NEXT_PUBLIC_B2C_POLICY_NAME || "B2C_1_signin"
    }
};

export const msalB2CConfig: Configuration = {
    auth: {
        clientId: process.env.NEXT_PUBLIC_B2C_CLIENT_ID || "ab1cd6e9-5244-4ff9-bfed-094f3e774121",
        // B2C Authority URL Structure: https://{tenant}.b2clogin.com/{tenant}.onmicrosoft.com/{policy}
        authority: `https://${process.env.NEXT_PUBLIC_B2C_TENANT_NAME || "pttplcb2ctest01"}.b2clogin.com/${process.env.NEXT_PUBLIC_B2C_TENANT_DOMAIN || "pttplcb2ctest01.onmicrosoft.com"}/${b2cPolicies.names.signIn}`,
        knownAuthorities: [`${process.env.NEXT_PUBLIC_B2C_TENANT_NAME || "pttplcb2ctest01"}.b2clogin.com`],
        redirectUri: getSafeWindowOrigin(),
        postLogoutRedirectUri: getSafeWindowOrigin()
    },
    cache: {
        cacheLocation: "localStorage", // Required to prevent popup/redirect isolation errors
    }
};

export const b2cLoginRequest = {
    scopes: ["openid", "profile", "email"], // Base scopes needed for ID Token
    prompt: "select_account"
};

// Create and export the instance directly to avoid React Context conflicts with the primary AD MSAL
export const b2cInstance = new PublicClientApplication(msalB2CConfig);
