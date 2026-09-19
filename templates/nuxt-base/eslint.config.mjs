import withNuxt from "./.nuxt/eslint.config.mjs"

export default withNuxt(
    {
        // Generated code: shadcn components and drizzle migrations are not edited by hand.
        ignores: ["app/components/ui/**", "drizzle/**"],
    },
    {
        // API tests assert on loose JSON bodies.
        files: ["test/**"],
        rules: { "@typescript-eslint/no-explicit-any": "off" },
    },
)
