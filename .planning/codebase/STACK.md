# Technology Stack

**Analysis Date:** 2026-03-24

## Languages

**Primary:**
- TypeScript 5.8.3 - All source code, React components, and utilities
- JavaScript (ES2020) - Configuration files and build setup

**Secondary:**
- CSS3 - Styling with Tailwind CSS utilities and custom fonts

## Runtime

**Environment:**
- Node.js v24.14.0 - Development and build environment
- Bun (latest) - Package manager and CI/CD execution (faster than npm)

**Package Manager:**
- Bun 1.x (frozen lockfile via `--frozen-lockfile`)
- Primary commands run through Bun in CI/CD pipeline

## Frameworks

**Core:**
- React 18.3.1 - UI framework, functional components with hooks
- React Router DOM 6.30.1 - Client-side routing
- TypeScript 5.8.3 - Type safety and development tooling

**UI Components:**
- Radix UI (27 component primitives) - Accessible UI building blocks
  - Dialog, Select, Dropdown, Tabs, Accordion, ScrollArea, etc.
  - Version: ^1.1.x to ^2.2.x depending on component
- shadcn/ui - Component wrapper layer on Radix UI, located in `src/components/ui/`
  - Auto-generated and managed via CLI

**Form & Validation:**
- React Hook Form 7.61.1 - Form state management and submission
- @hookform/resolvers 3.10.0 - Form validation resolver integration
- Zod 3.25.76 - Schema validation library

**Rich Text Editing:**
- TipTap 2.11.0 - WYSIWYG editor framework
- TipTap Extensions:
  - @tiptap/starter-kit 2.11.0 - Core extensions (Bold, Italic, Underline, etc.)
  - @tiptap/extension-color 2.27.2 - Text color support
  - @tiptap/extension-highlight 2.27.2 - Text highlighting
  - @tiptap/extension-text-align 2.11.0 - Paragraph alignment
  - @tiptap/extension-font-family 2.27.2 - Font family selection
  - @tiptap/extension-placeholder 2.11.0 - Placeholder text
  - @tiptap/extension-subscript, superscript, underline 2.x - Text formatting

**State & Data:**
- TanStack React Query 5.83.0 - Server state management and caching
- React Context API - Auth state (`useAuth` hook in `src/hooks/useAuth.tsx`)

**Charts & Visualization:**
- Recharts 2.15.4 - Data visualization charts (BarChart, LineChart, etc.)
- KaTeX 0.16.38 - Mathematical equation rendering
- React Markdown 10.1.0 - Markdown to React component rendering

**Document Handling:**
- @react-pdf/renderer 4.0.0 - PDF generation from React components
- docx 9.6.1 - DOCX file generation and manipulation
- mammoth 1.12.0 - DOCX file parsing and text extraction
- docx-preview 0.3.7 - DOCX file preview rendering
- pdfjs-dist 4.4.168 - PDF parsing and rendering

**Styling:**
- Tailwind CSS 3.4.17 - Utility-first CSS framework
- PostCSS 8.5.6 - CSS processing
- Autoprefixer 10.4.21 - CSS vendor prefixing
- tailwind-merge 2.6.0 - Utility class merging (conflict resolution)
- tailwindcss-animate 1.0.7 - Animation utility classes
- @tailwindcss/typography 0.5.16 - Prose styling plugin

**Accessibility & UX:**
- Lucide React 0.462.0 - Icon library (482+ icons)
- Sonner 1.7.4 - Toast/notification system
- Framer Motion 12.33.0 - Animation and motion library
- next-themes 0.3.0 - Theme switching (light/dark mode)
- vaul 0.9.9 - Drawer component primitives
- react-resizable-panels 2.1.9 - Resizable panel layout
- embla-carousel-react 8.6.0 - Carousel/slider component
- react-day-picker 8.10.1 - Date picker component
- input-otp 1.4.2 - OTP input field
- cmdk 1.1.1 - Command menu/palette component
- date-fns 3.6.0 - Date utility library
- class-variance-authority 0.7.1 - Variant component pattern helper
- clsx 2.1.1 - Conditional className utility

**Testing:**
- Vitest 3.2.4 - Test runner (Vite-native, faster than Jest)
- @testing-library/react 16.3.2 - React component testing utilities
- @testing-library/jest-dom 6.6.0 - DOM matchers for assertions
- @testing-library/user-event 14.6.1 - User interaction simulation
- jsdom 20.0.3 - DOM implementation for Node.js
- @vitest/coverage-v8 3.2.4 - Code coverage reporting (V8 engine)

**Build & Development:**
- Vite 5.4.19 - Build tool and dev server
  - Config: `vite.config.ts`
  - Dev server: http://localhost:8080
  - Module deduplication for React, React DOM, React Query, Radix UI Tooltip
- @vitejs/plugin-react-swc 3.11.0 - React JSX transform (SWC compiler)
- lovable-tagger 1.1.13 - Component tagging in development mode

**Linting & Quality:**
- ESLint 9.32.0 - Code linting and style enforcement
  - Config: `eslint.config.js` (flat config format)
  - Plugins: react-hooks, react-refresh, typescript-eslint
- typescript-eslint 8.38.0 - TypeScript linting rules

**Type Safety:**
- TypeScript 5.8.3
  - Config: `tsconfig.json` with path alias `@/*` → `./src/*`
  - Strict options disabled: `noImplicitAny: false`, `strictNullChecks: false`
  - Node types: @types/node 22.16.5

## Configuration

**Environment:**
- Vite mode-based configuration (`vite.config.ts`)
- Environment variables via `import.meta.env.VITE_*`
- Required vars defined in `.env.example`:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_PUBLISHABLE_KEY`
  - `VITE_SUPABASE_PROJECT_ID`

**Build:**
- Development: `npm run dev` → Vite dev server on port 8080
- Production: `npm run build` → `vite build` → outputs to `dist/`
- Preview: `npm run preview` → Preview production build locally
- Development build: `npm run build:dev` → Build with development mode

**Memory Configuration:**
- Tests run with `NODE_OPTIONS='--max-old-space-size=19456'` (19GB)
- Vitest fork pool: max 4 workers, min 1 worker
- Vitest maxConcurrency: 10 tests per worker
- Configured in `vitest.config.ts` for memory stability

## Platform Requirements

**Development:**
- Node.js v24.14.0+ (or Bun for faster package management)
- npm, Bun, or yarn (Bun preferred for CI/CD)
- TypeScript 5.8.3+ (`npm install -g typescript`)

**Production:**
- Static file hosting (Cloudflare Pages via GitHub Actions)
- Node.js-independent runtime (compiled to static assets)
- Modern browser with ES2020 support
- Supabase backend (auth, database, edge functions)

**Browser Support:**
- ECMAScript 2020 target
- Modern browsers (Chrome, Firefox, Safari, Edge)
- LocalStorage required for session persistence

---

*Stack analysis: 2026-03-24*
