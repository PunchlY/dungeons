dev:
    bun src/**/*.html

build: dependencies
    bun build --target=browser src/index.html --outdir=dist

dependencies:
    bun install --frozen-lockfile
