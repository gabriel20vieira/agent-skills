FROM node:24-slim AS build
WORKDIR /src
COPY package.json package-lock.json ./
# Scripts are skipped here: postinstall runs `nuxt prepare`, which needs the sources.
RUN npm ci --ignore-scripts
COPY . .
ENV NODE_ENV=production
RUN npm run build

FROM node:24-slim AS release
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /src/.output ./.output
# drizzle-kit and mysql2 run at boot (migrations), so node_modules ships too.
COPY --from=build /src/node_modules ./node_modules
COPY --from=build /src/package.json /src/drizzle.config.ts ./
COPY --from=build /src/server/db ./server/db
COPY --from=build /src/drizzle ./drizzle
COPY --from=build /src/scripts ./scripts
COPY docker/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh
USER node
EXPOSE 3000
ENTRYPOINT ["/entrypoint.sh"]
