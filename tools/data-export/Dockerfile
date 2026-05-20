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

RUN npm install -g pnpm@10.0.0

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

RUN pnpm fetch

COPY . .

RUN pnpm install --offline --frozen-lockfile \
  && pnpm --filter @allmaps/data-export^... run build

WORKDIR /allmaps/tools/data-export

CMD ["./scripts/run.sh"]
