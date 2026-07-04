# Spec: slugify

Export a function `slugify(title: string): string` that turns a human-readable title into a
URL slug.

Rules:
1. Lowercase everything.
2. Replace any run of whitespace or punctuation with a single hyphen `-`.
3. Remove any character that is not a lowercase ASCII letter, a digit, or a hyphen.
4. Collapse multiple consecutive hyphens into a single hyphen.
5. Strip leading and trailing hyphens from the result.
6. Input that is empty or contains no letters/digits returns the empty string `""`.

Examples:
- `slugify("Hello, World!")` === `"hello-world"`
- `slugify("  Multiple   Spaces  ")` === `"multiple-spaces"`
- `slugify("Node.js & TypeScript")` === `"node-js-typescript"`
- `slugify("--already--slug--")` === `"already-slug"`
- `slugify("Café del Mar")` === `"caf-del-mar"`  (non-ASCII letters are removed)
- `slugify("!!!")` === `""`
