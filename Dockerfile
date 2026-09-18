# syntax=docker/dockerfile:1.7

FROM node:24-alpine AS deps
WORKDIR /workspace
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/app/package.json ./packages/app/
RUN --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile --prod=false

FROM node:24-alpine AS runtime
WORKDIR /workspace
ENV NODE_ENV=production \
    PORT=3000
RUN corepack enable
COPY --from=deps /workspace ./
COPY packages/app/src ./packages/app/src
COPY packages/app/public ./packages/app/public
COPY packages/app/tsconfig.json ./packages/app/
USER node
EXPOSE 3000
CMD ["pnpm", "--filter", "app", "start"]
