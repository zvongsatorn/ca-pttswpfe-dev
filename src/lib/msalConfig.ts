import { Configuration } from "@azure/msal-browser";
import { getSafeWindowOrigin } from "@/utils/security";

export const msalConfig: Configuration = {
    auth: {
        clientId: process.env.AZURE_CLIENT_ID || "25aaed59-289e-4391-ac6a-9ef5561a0327",
        authority: `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID || "11438945-344b-4f06-b424-78384c52ceb1"}`,
        redirectUri: getSafeWindowOrigin(),
        postLogoutRedirectUri: getSafeWindowOrigin()
    },
    cache: {
        cacheLocation: "localStorage", // Changed from sessionStorage to fix popup isolation issues
    }
};

export const loginRequest = {
    scopes: ["User.Read"],
    prompt: "select_account" // Forces the login screen to appear even if a session exists
};
