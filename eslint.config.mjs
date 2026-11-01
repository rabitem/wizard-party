import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import { defineConfig, globalIgnores } from "eslint/config";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,

  // Global ignores
  globalIgnores([
    ".next/**",
    "**/.next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    ".worktrees/**",
    ".claude/worktrees/**",
    "node_modules/**",
    ".wrangler/**",
    ".codex/**",
    // Animation sandbox audit output and scratch files
    ".animation-audit/**",
  ]),

  // Strict rules for all TypeScript/JavaScript files
  {
    files: ["**/*.{ts,tsx,js,jsx,mjs}"],
    rules: {
      // =============================================================================
      // FILE SIZE LIMITS - No god classes/components
      // =============================================================================
      "max-lines": ["error", {
        max: 300,
        skipBlankLines: true,
        skipComments: true,
      }],
      "max-lines-per-function": ["warn", {
        max: 100,
        skipBlankLines: true,
        skipComments: true,
        IIFEs: true,
      }],

      // =============================================================================
      // COMPLEXITY LIMITS
      // =============================================================================
      "complexity": ["warn", { max: 15 }],
      "max-depth": ["warn", { max: 4 }],
      "max-nested-callbacks": ["warn", { max: 3 }],
      "max-params": ["warn", { max: 5 }],

      // =============================================================================
      // CODE QUALITY
      // =============================================================================
      "no-unused-vars": "off", // TypeScript handles this
      "@typescript-eslint/no-unused-vars": ["error", {
        "args": "none", // Allow unused function arguments (needed for interface compliance)
        "ignoreRestSiblings": true,
      }],
      "no-console": ["warn", { allow: ["warn", "error"] }],
      "no-debugger": "error",
      "no-alert": "error",
      "no-var": "error",
      "prefer-const": "error",
      "prefer-arrow-callback": "error",
      "prefer-template": "warn",
      "no-duplicate-imports": "error",
      "no-useless-rename": "error",
      "object-shorthand": "warn",
      "no-unneeded-ternary": "warn",
      "no-nested-ternary": "warn",
      "no-else-return": "warn",
      "no-lonely-if": "warn",
      "no-useless-return": "warn",

      // =============================================================================
      // PREVENT COMMON BUGS
      // =============================================================================
      "no-await-in-loop": "warn",
      "no-constant-binary-expression": "error",
      "no-constructor-return": "error",
      "no-promise-executor-return": "error",
      "no-self-compare": "error",
      "no-template-curly-in-string": "warn",
      "no-unmodified-loop-condition": "error",
      "no-unreachable-loop": "error",
      "require-atomic-updates": "warn",
      "array-callback-return": ["error", { allowImplicit: true }],

      // =============================================================================
      // REACT SPECIFIC
      // =============================================================================
      "react/jsx-no-useless-fragment": "warn",
      "react/jsx-curly-brace-presence": ["warn", {
        props: "never",
        children: "never"
      }],
      "react/self-closing-comp": "warn",
      "react/jsx-boolean-value": ["warn", "never"],
      "react/no-array-index-key": "warn",
      "react/jsx-no-constructed-context-values": "error",
      "react/jsx-no-leaked-render": "warn",

      // =============================================================================
      // REACT HOOKS - Strict enforcement
      // =============================================================================
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",

      // =============================================================================
      // TYPESCRIPT STRICT
      // =============================================================================
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-non-null-assertion": "warn",

      // =============================================================================
      // ACCESSIBILITY
      // =============================================================================
      "jsx-a11y/click-events-have-key-events": "warn",
      "jsx-a11y/no-static-element-interactions": "warn",
      "jsx-a11y/anchor-is-valid": "warn",
    },
  },

  // Web Storage throws in blocked/private/full browsers: all access goes through src/lib/storage.
  {
    files: ["src/**/*.{ts,tsx}"],
    ignores: ["src/lib/storage/**", "**/*.test.{ts,tsx}"],
    rules: {
      "no-restricted-globals": ["error",
        { name: "localStorage", message: "Use safeLocalStorage from '@/lib/storage' (storage can throw)." },
        { name: "sessionStorage", message: "Use safeSessionStorage from '@/lib/storage' (storage can throw)." },
      ],
      "no-restricted-properties": ["error",
        { object: "window", property: "localStorage", message: "Use safeLocalStorage from '@/lib/storage'." },
        { object: "window", property: "sessionStorage", message: "Use safeSessionStorage from '@/lib/storage'." },
        { object: "globalThis", property: "localStorage", message: "Use safeLocalStorage from '@/lib/storage'." },
        { object: "globalThis", property: "sessionStorage", message: "Use safeSessionStorage from '@/lib/storage'." },
      ],
    },
  },

  // Relax rules for test files
  {
    files: ["**/*.test.{ts,tsx}", "**/*.spec.{ts,tsx}", "**/__tests__/**"],
    rules: {
      "max-lines": "off",
      "max-lines-per-function": "off",
    },
  },

  // Relax rules for config files
  {
    files: ["*.config.{js,mjs,ts}", "*.config.*.{js,mjs,ts}"],
    rules: {
      "max-lines": "off",
    },
  },

  // Relax for shared domain (some files are intentionally large due to type definitions)
  {
    files: ["shared/**/*.ts"],
    rules: {
      "max-lines": ["warn", { max: 400, skipBlankLines: true, skipComments: true }],
    },
  },

  // Relax for the game worker (the room is a large state machine)
  {
    files: ["party/**/*.ts"],
    rules: {
      "max-lines": ["warn", { max: 400, skipBlankLines: true, skipComments: true }],
      "no-console": "off",
    },
  },

  // Room integration specs drive whole tables; keep each scenario explicit.
  {
    files: ["party/**/*.test.ts"],
    rules: {
      "max-lines": "off",
    },
  },

  // Relax for special pages (legal pages, opengraph images)
  {
    files: [
      "src/app/privacy/**",
      "src/app/imprint/**",
      "src/app/*-image.tsx",
      "src/app/error.tsx",
    ],
    rules: {
      "max-lines": "off",
      "max-lines-per-function": "off",
    },
  },

  // Relax for data/config files (presets, sound definitions, etc.)
  {
    files: [
      "src/lib/sounds.ts",
      "src/presentation/components/settings/*-presets.ts",
      "src/presentation/components/settings/*.tsx",
      "src/presentation/config/**",
    ],
    rules: {
      "max-lines": ["warn", { max: 400, skipBlankLines: true, skipComments: true }],
    },
  },

  // Relax for complex UI components that need more lines
  {
    files: [
      "src/presentation/components/TrumpSelectionUI.tsx",
      "src/presentation/components/TutorialModal.tsx",
      "src/presentation/components/room-browser/*.tsx",
      "src/presentation/components/round-end/*.tsx",
      "src/presentation/components/overlays/*.tsx",
      "src/app/**/*.tsx",
    ],
    rules: {
      "max-lines": ["warn", { max: 400, skipBlankLines: true, skipComments: true }],
    },
  },
]);

export default eslintConfig;
