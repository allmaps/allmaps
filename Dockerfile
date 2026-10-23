# syntax=docker/dockerfile:1

# Builds every self-hostable service from the monorepo. Pick one with --target
# and APP_DIR; compose.yaml shows each combination.

# Node, pnpm, Rust and wasm-pack; compose.override.yaml runs this with the
# source mounted for development
FROM node:24-bookworm AS toolchain
ENV CI=true HUSKY=0 PATH=/root/.cargo/bin:$PATH
RUN curl -sSf https://sh.rustup.rs | sh -s -- -y --profile minimal \
      --target wasm32-unknown-unknown \
  && cargo install wasm-pack --locked \
  && npm install -g pnpm@12.9.1
WORKDIR /src

FROM toolchain AS build
ENV ADAPTER=node
COPY pnpm-lock.yaml pnpm-workspace.yaml ./
RUN --mount=type=cache,id=pnpm-store,target=/pnpm-store \
  pnpm fetch --store-dir /pnpm-store
COPY . .
RUN --mount=type=cache,id=pnpm-store,target=/pnpm-store \
  pnpm install --offline --frozen-lockfile --store-dir /pnpm-store
RUN pnpm turbo run build \
  --filter=@allmaps/api-rest... --filter=@allmaps/api-annotations... \
  --filter=@allmaps/api-live... --filter=@allmaps/editor... \
  --filter=@allmaps/viewer... --filter=@allmaps/console... \
  --filter=@allmaps/tileserver^... --filter=@allmaps/preview^...

FROM ubuntu:24.04 AS runtime
RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates \
  && rm -rf /var/lib/apt/lists/*
WORKDIR /app

# Node services: APIs and SvelteKit apps
FROM build AS node-deploy
ARG APP_DIR
RUN pnpm deploy --filter ./$APP_DIR --prod /out \
  && for d in dist build; do \
       if [ -d $APP_DIR/$d ]; then rm -rf /out/$d && cp -r $APP_DIR/$d /out/; fi; \
     done

FROM runtime AS node
COPY --from=node:24-bookworm-slim /usr/local/bin/node /usr/local/bin/node
COPY --from=node-deploy /out .
ENV NODE_ENV=production
USER ubuntu

# Cloudflare Workers on workerd
FROM build AS workerd-deploy
ARG APP_DIR
WORKDIR /src/$APP_DIR
RUN pnpm exec wrangler deploy --dry-run --outdir /out/worker \
  && sh /src/docker/workerd-config.sh /out > /out/config.capnp \
  && cp "$(find /src/node_modules/.pnpm -path '*/@cloudflare/workerd-linux-*/bin/workerd' | head -1)" /out/

FROM runtime AS workerd
COPY --from=workerd-deploy /out .
USER ubuntu
ENTRYPOINT ["/app/workerd", "serve", "/app/config.capnp"]

# IIIF image server for the files in /images
FROM runtime AS cantaloupe
ARG CANTALOUPE_VERSION=5.0.7
RUN apt-get update \
  && apt-get install -y --no-install-recommends openjdk-21-jre-headless curl unzip \
  && curl -sSfL -o /tmp/cantaloupe.zip \
    https://github.com/cantaloupe-project/cantaloupe/releases/download/v$CANTALOUPE_VERSION/cantaloupe-$CANTALOUPE_VERSION.zip \
  && unzip -q /tmp/cantaloupe.zip -d /opt \
  && mv /opt/cantaloupe-$CANTALOUPE_VERSION /opt/cantaloupe \
  && mv /opt/cantaloupe/cantaloupe-$CANTALOUPE_VERSION.jar /opt/cantaloupe/cantaloupe.jar \
  && sed -e 's|^http.port = .*|http.port = 8080|' \
    -e 's|^FilesystemSource.BasicLookupStrategy.path_prefix = .*|FilesystemSource.BasicLookupStrategy.path_prefix = /images/|' \
    -e 's|^log.application.level = .*|log.application.level = info|' \
    /opt/cantaloupe/cantaloupe.properties.sample > /opt/cantaloupe/cantaloupe.properties \
  && apt-get purge -y curl unzip && apt-get autoremove -y \
  && rm -rf /tmp/cantaloupe.zip /var/lib/apt/lists/* \
  && mkdir /images && chown ubuntu /images
USER ubuntu
CMD ["java", "-Dcantaloupe.config=/opt/cantaloupe/cantaloupe.properties", "-jar", "/opt/cantaloupe/cantaloupe.jar"]

FROM postgres:17-bookworm AS postgres
RUN apt-get update \
  && apt-get install -y --no-install-recommends postgresql-17-postgis-3 \
  && rm -rf /var/lib/apt/lists/*
