# Reproducible, pinned, non-root development image for running research.
# Multi-stage: a base toolchain layer, then a dev layer with dependencies.

FROM node:22.12.0-alpine3.20 AS base
RUN apk add --no-cache make git
WORKDIR /repo

FROM base AS dev
# Copy manifests first so dependency installs are cached independently of source.
COPY packages/tech/package*.json packages/tech/
COPY packages/industry/package*.json packages/industry/
RUN cd packages/tech && npm install \
  && cd ../industry && npm install
COPY . .
# Run as the unprivileged user that the node image provides.
USER node
CMD ["make", "test"]
