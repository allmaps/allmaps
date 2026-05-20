FROM node:25-bookworm

RUN apt-get update \
  && apt-get -y install --no-install-recommends \
    build-essential \
    ca-certificates \
    git \
    libsqlite3-dev \
    rclone \
    zlib1g-dev \
  && rm -rf /var/lib/apt/lists/*

RUN git clone https://github.com/felt/tippecanoe.git /tmp/tippecanoe \
  && cd /tmp/tippecanoe \
  && make \
  && make install \
  && rm -rf /tmp/tippecanoe

WORKDIR /allmaps

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json tsconfig.json tsconfig.base.json ./
COPY packages ./packages
COPY tools/data-export ./tools/data-export

RUN corepack enable \
  && corepack prepare pnpm@10.0.0 --activate \
  && pnpm install --frozen-lockfile \
  && pnpm --filter @allmaps/data-export... run build

WORKDIR /allmaps/tools/data-export

CMD ["./scripts/run.sh"]
