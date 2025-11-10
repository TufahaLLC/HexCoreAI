import type { BaseLayoutProps } from "fumadocs-ui/layouts/shared";

/**
 * Shared layout configurations
 *
 * you can customise layouts individually from:
 * Home Layout: app/(home)/layout.tsx
 * Docs Layout: app/docs/layout.tsx
 */
export function baseOptions(): BaseLayoutProps {
  return {
    nav: {
      title: (
        <>
          <svg
            aria-labelledby="nav-logo-title"
            height="24"
            role="img"
            width="24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <title id="nav-logo-title">HexCore AI logo</title>
            <circle cx={12} cy={12} fill="currentColor" r={12} />
          </svg>
          My App
        </>
      ),
    },
    // see https://fumadocs.dev/docs/ui/navigation/links
    links: [],
  };
}
