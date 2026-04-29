import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // _ prefix'li parametreler kasıtlı unused — ESLint convention
  {
    rules: {
      "@typescript-eslint/no-unused-vars": ["warn", {
        argsIgnorePattern: "^_",
        varsIgnorePattern: "^_",
      }],
      // Dosya büyüklük koruması — 400 satır üstü uyarı verir.
      // Bir daha tekrarlanmaması için: Her PR'da ESLint bu kuralı kontrol eder.
      "max-lines": ["warn", {
        max: 400,
        skipBlankLines: true,
        skipComments: true,
      }],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
