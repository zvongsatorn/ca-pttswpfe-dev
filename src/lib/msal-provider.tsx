"use client";

import { PublicClientApplication } from "@azure/msal-browser";
import { MsalProvider as Provider } from "@azure/msal-react";
import { msalConfig } from "./msalConfig";
import { ReactNode, useEffect, useState } from "react";

const msalInstance = new PublicClientApplication(msalConfig);

export function MsalProvider({ children }: { children: ReactNode }) {
    const [isInitialized, setIsInitialized] = useState(false);

    useEffect(() => {
        const initializeMsal = async () => {
            try {
                await msalInstance.initialize();
                await msalInstance.handleRedirectPromise().catch(err => {
                    console.warn("MSAL Redirect Promise Cache Error (Expected for Popups):", err);
                });
                setIsInitialized(true);
            } catch (error) {
                console.error("MSAL Initialization Error:", error);
            }
        };
        initializeMsal();
    }, []);

    if (!isInitialized) {
        // Return nothing while MSAL initializes to prevent hydration errors or login flashes
        return null; 
    }

    return (
        <Provider instance={msalInstance}>
            {children}
        </Provider>
    );
}
