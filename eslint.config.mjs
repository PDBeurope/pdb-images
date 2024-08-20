import globals from "globals";
import stylisticEslintPlugin from "@stylistic/eslint-plugin";
import typescriptEslint from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";

export default [{
    languageOptions: {
        globals: {
            ...globals.browser,
            ...globals.node,
        },
        ecmaVersion: 2018,
        sourceType: "module",
        parserOptions: {
            ecmaFeatures: {
                impliedStrict: true,
            },
        },
    },

    rules: {
        "indent": "off",
        "arrow-parens": ["off", "as-needed"],
        "brace-style": "off",
        "comma-spacing": "off",
        "space-infix-ops": "off",
        "comma-dangle": "off",
        "eqeqeq": ["error", "smart"],
        "import/order": "off",
        "no-eval": "warn",
        "no-new-wrappers": "warn",
        "no-trailing-spaces": "error",
        "no-unsafe-finally": "warn",
        "no-var": "error",
        "spaced-comment": "error",
        "semi": "warn",
        "no-restricted-syntax": ["error", {
            selector: "ExportDefaultDeclaration",
            message: "Default exports are not allowed",
        }],
        "no-throw-literal": "error",
        "key-spacing": "error",
        "object-curly-spacing": ["error", "always"],
        "array-bracket-spacing": "error",
        "space-in-parens": "error",
        "computed-property-spacing": "error",
        "prefer-const": ["error", {
            destructuring: "all",
            ignoreReadBeforeAssign: false,
        }],
        "space-before-function-paren": "off",
        "func-call-spacing": "off",
        "no-multi-spaces": "error",
        "block-spacing": "error",
        "keyword-spacing": "off",
        "space-before-blocks": "error",
        "semi-spacing": "error",
    },
}, {
    files: ["**/*.ts", "**/*.tsx"],

    plugins: {
        "@typescript-eslint": typescriptEslint,
        "@stylistic": stylisticEslintPlugin,
    },

    languageOptions: {
        parser: tsParser,
        ecmaVersion: 5,
        sourceType: "module",
        parserOptions: {
            project: ["tsconfig.json", "tsconfig-eslint.json"],
        },
    },

    rules: {
        "@stylistic/indent": ["error", 4],
        "@stylistic/member-delimiter-style": ["off", {
            multiline: {
                delimiter: "none",
                requireLast: true,
            },
            singleline: {
                delimiter: "semi",
                requireLast: false,
            },
        }],
        "@stylistic/quotes": ["error", "single", {
            avoidEscape: true,
            allowTemplateLiterals: true,
        }],
        "@stylistic/semi": ["off", null],
        "@stylistic/type-annotation-spacing": "error",
        "@stylistic/brace-style": ["error", "1tbs", {
            allowSingleLine: true,
        }],
        "@stylistic/comma-spacing": "error",
        "@stylistic/space-infix-ops": "error",
        "@stylistic/space-before-function-paren": ["error", {
            anonymous: "always",
            named: "never",
            asyncArrow: "always",
        }],
        "@stylistic/func-call-spacing": ["error"],
        "@stylistic/keyword-spacing": ["error"],
    },
}];
