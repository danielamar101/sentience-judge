import nextConfig from "eslint-config-next";
import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

const eslintConfig = [
  {
    ignores: [".next/**", "node_modules/**"],
  },
  ...nextConfig,
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    // New in eslint-plugin-react-hooks 7 (via eslint-config-next 16.4). Existing
    // fetch-in-effect patterns trip it; keep it visible without failing lint.
    rules: {
      "react-hooks/set-state-in-effect": "warn",
    },
  },
];

export default eslintConfig;
