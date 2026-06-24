# syntax=docker/dockerfile:1

# ---- build stage: compile TS -> dist (the build script also copies the Bengali font) ----
# node:24-bookworm-slim matches the runtime image's Node major (node:24-bookworm), so the
# emitted .js runs identically in both. Skip Chrome download here — this stage only runs tsc.
FROM node:24-bookworm-slim AS build
# Skip ALL Puppeteer browser downloads (Chrome + chrome-headless-shell) — this stage only
# runs tsc. PUPPETEER_SKIP_CHROME_DOWNLOAD alone leaves the headless-shell download on.
ENV PUPPETEER_SKIP_DOWNLOAD=true
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# ---- runtime stage: official Puppeteer image (Debian + Chrome preinstalled & cached) ----
# Tag pinned to 25.2.0 to match our npm `puppeteer` pin, so the cached Chrome build is the
# exact one this Puppeteer version drives. Default user is `pptruser` (uid 10042); Chrome
# lives in PUPPETEER_CACHE_DIR=/home/pptruser/.cache/puppeteer.
FROM ghcr.io/puppeteer/puppeteer:25.2.0
ENV NODE_ENV=production \
    PUPPETEER_SKIP_DOWNLOAD=true
WORKDIR /home/pptruser/app

# Install production deps only. PUPPETEER_SKIP_DOWNLOAD keeps npm from re-downloading the
# browser — the image already has the matching Chrome 25.2.0 build cached in PUPPETEER_CACHE_DIR.
COPY --chown=pptruser:pptruser package.json package-lock.json ./
RUN npm ci --omit=dev

COPY --chown=pptruser:pptruser --from=build /app/dist ./dist

EXPOSE 5000

# Hit 127.0.0.1 explicitly, never `localhost` — IPv6 ::1 resolution makes the check fail and
# the container flap unhealthy behind Traefik. Node 24 has a global fetch, so no curl needed.
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:5000/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "dist/server.js"]
