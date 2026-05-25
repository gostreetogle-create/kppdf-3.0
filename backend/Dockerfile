# ---- Build Stage ----
FROM node:22-alpine AS build
WORKDIR /app

# 1. Backend dependencies
COPY backend/package*.json ./backend/
RUN cd backend && npm ci

# 2. Backend source + shared types
COPY backend/ ./backend/
COPY shared/ ./shared/

# 3. Build backend (tsc)
RUN cd backend && npm run build

# ---- Production Stage ----
FROM node:22-alpine AS production
WORKDIR /app
RUN apk add --no-cache tini

# 1. Production dependencies only
COPY backend/package*.json ./
RUN npm ci --only=production && npm cache clean --force

# 2. Compiled backend
COPY --from=build /app/backend/dist ./dist

# 3. Env file
COPY --from=build /app/backend/.env.production ./

USER node
EXPOSE 3000
ENTRYPOINT ["/sbin/tini", "--"]
# rootDir: ".." в tsconfig → dist/backend/src/index.js
# См. backend/tsconfig.json: outDir ./dist, rootDir ..
CMD ["node", "dist/backend/src/index.js"]
