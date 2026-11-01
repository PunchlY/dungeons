dev:
    bun src/**/*.html

build:
    bun install --frozen-lockfile --omit=peer
    bun scripts/build.ts
