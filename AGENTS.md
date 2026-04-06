# Project Intelligence: Next.js 16 & PTT SWP

Welcome! This repository uses a high-performance Next.js 16 stack. To ensure the best development experience and performance, please refer to our internal guidelines:

## Core Standards
- **Framework**: Next.js 16.2.1 (App Router)
- **React**: 19.2 (Stable Compiler)
- **Bundler**: Turbopack (Default)
- **Styling**: Tailwind CSS 4.0 & Ant Design 6.x

## AI Agent Instructions
1. **Best Practices**: Always follow the rules defined in [.agents/next-best-practices.md](.agents/next-best-practices.md).
2. **Component Boundaries**: Keep Server and Client components clearly separated.
3. **Data Security**: Never expose system tokens (CA&A) in Client Components. Use Server Actions or the Backend API.

## Troubleshooting
- If encountering hydration errors, verify if `ant-design/nextjs-registry` is wrapping the layout correctly.
- If SSO fails, check `backend/services/configService.ts` for direct `curl` logs.

---
*Attached Skills:*
- [Next Best Practices](.agents/next-best-practices.md)
