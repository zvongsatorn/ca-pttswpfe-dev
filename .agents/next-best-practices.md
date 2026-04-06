# Next.js 16 Best Practices (Vercel Labs Official)

This project follows the official `vercel-labs/next-skills` guidelines for Next.js 16 development. AI agents should strictly adhere to these rules.

## 1. File Conventions & Routing
- **App Router**: Exclusively use the `app/` directory.
- **Next.js 16 Proxy**: Use `proxy.ts` instead of `middleware.ts` for network boundaries and request management.
- **Special Files**: Correctly utilize `layout.tsx`, `page.tsx`, `loading.tsx`, `error.tsx`, `not-found.tsx`, and `global-error.tsx`.
- **Parallel & Intercepting Routes**: Use `@slot` and `(.)` conventions for complex UI like modals or dashboards.

## 2. React Server Components (RSC) Boundaries
- **Server by Default**: All components in `app/` are RSCs unless marked with `"use client"`.
- **Invalid Patterns**: Do not use async Client Components.
- **Serialization**: Ensure props passed from Server to Client are serializable (no functions, dates, or complex classes).

## 3. Async API Patterns (Next.js 15/16)
- **Async Params**: `params` and `searchParams` in pages and layouts are now **Promises**. Must be awaited or used with `use()`.
- **Async Headers/Cookies**: `cookies()` and `headers()` are async and must be awaited.
- **unstable_rethrow**: Use `unstable_rethrow` in catch blocks to ensure Next.js internal errors (like redirects) propagate correctly.

## 4. Directives & Functions
- **"use cache"**: Use the Next.js 16 directive for explicit, fine-grained caching of functions or components.
- **Server Functions**: Use `cookies`, `headers`, `draftMode`, and the new `after` function for post-response logic.
- **Generate Functions**: Use `generateStaticParams` for SSG and `generateMetadata` for dynamic SEO.

## 5. Data Fetching & Mutations
- **Avoid Waterfalls**: Use `Promise.all()` or the `preload` pattern to fetch data in parallel.
- **Server Actions Over API**: Prefer `"use server"` actions for mutations.
- **Route Handlers**: Use `route.ts` only for non-React endpoints (webhooks, external APIs). Note: GET handlers conflict with `page.tsx` in the same route.
- **Validation**: Use Zod for all incoming data validation (Actions, SearchParams, API bodies).

## 6. Optimization
- **React Compiler**: Stable in v16. Avoid manual `useMemo`/`useCallback` unless specifically debugging a compiler failure.
- **Image & Font**: Always use `next/image` (with `sizes` and `priority` where appropriate) and `next/font`.
- **Turbopack**: Use as the default bundler for faster builds and HMR.
- **Standalone Output**: Use `output: 'standalone'` for optimized Docker deployments.

## 7. Error Handling & SEO
- **Auth Errors**: Use `unauthorized()` or `forbidden()`.
- **Navigation**: Use `redirect`, `permanentRedirect`, or `notFound`.
- **Metadata**: Use the Metadata API for SEO and OG images (`next/og`).

## 8. TypeScript Strictness
- **No `any`**: Never use the `any` type in TypeScript.
- **Strong Typing**: Always define proper `interface` or `type` definitions for data structures. If a response type is truly unpredictable, use `unknown` instead of `any` and perform type narrowing.

---
*Source: https://skills.sh/vercel-labs/next-skills/next-best-practices*
*Sync Date: 2025-03-25*
