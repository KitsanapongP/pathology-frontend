import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    files: ["src/**/*.{ts,tsx}"],
    ignores: ["src/lib/api-client.ts"],
    rules: {
      "no-restricted-syntax": ["error",
        { selector: "CallExpression[callee.name='fetch']", message: "Use portalApi or a request-scoped createApiClient for service HTTP calls." },
        { selector: "CallExpression[callee.type='MemberExpression'][callee.property.name='fetch']", message: "Keep HTTP transport in src/lib/api-client.ts." },
        { selector: "NewExpression[callee.name='XMLHttpRequest']", message: "Use the shared API client instead of XMLHttpRequest." },
      ],
      "no-restricted-imports": ["error", { paths: [{ name: "axios", message: "Use the shared API client." }] }],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    ".next-pages/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "coverage/**",
    "playwright-report/**",
    "test-results/**",
    "reports/**",
  ]),
]);

export default eslintConfig;
