import js from "@eslint/js";
import { defineConfig } from "eslint/config";
import prettier from "eslint-config-prettier";
import globals from "globals";
import tseslint from "typescript-eslint";

export default defineConfig(
  {
    ignores: [
      "coverage/**",
      "dist/**",
      "node_modules/**",
      "playwright-report/**",
      "test-results/**"
    ]
  },
  js.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  {
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.worker
      },
      parserOptions: {
        project: "./tsconfig.json",
        tsconfigRootDir: import.meta.dirname
      }
    },
    rules: {
      "@typescript-eslint/consistent-type-definitions": ["error", "interface"],
      "@typescript-eslint/no-confusing-void-expression": "off",
      "@typescript-eslint/no-empty-object-type": "off",
      "@typescript-eslint/no-inferrable-types": "off",
      "@typescript-eslint/no-misused-promises": [
        "error",
        {
          checksVoidReturn: false
        }
      ],
      "@typescript-eslint/no-unnecessary-condition": "off"
    }
  },
  prettier
);
