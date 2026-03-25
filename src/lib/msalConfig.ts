import { Configuration } from "@azure/msal-browser";

export const msalConfig: Configuration = {
    auth: {
        clientId: process.env.AZURE_CLIENT_ID || "850779f2-e0b3-4f7c-a50a-aa1c01da73f1",
        authority: `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID || "11438945-344b-4f06-b424-78384c52ceb1"}`,
        redirectUri: typeof window !== "undefined" ? window.location.origin : undefined,
        postLogoutRedirectUri: typeof window !== "undefined" ? window.location.origin : undefined
    },
    cache: {
        cacheLocation: "localStorage", // Changed from sessionStorage to fix popup isolation issues
    }
};

export const loginRequest = {
    scopes: ["User.Read"],
    prompt: "select_account" // Forces the login screen to appear even if a session exists
};
