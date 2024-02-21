# syntax=docker/dockerfile:1

# Comments are provided throughout this file to help you get started.
# If you need more help, visit the Dockerfile reference guide at
# https://docs.docker.com/engine/reference/builder/

ARG NODE_VERSION=21.3.0
ARG PNPM_VERSION=8.12.0


FROM node:${NODE_VERSION} as contracts-local
RUN apt-get update
RUN apt-get install -y build-essential cmake libgmp-dev libsodium-dev nasm curl m4
RUN curl -L https://foundry.paradigm.xyz | bash
RUN . /root/.bashrc && foundryup

WORKDIR /usr/src/app
COPY contract contract
COPY .env .
# RUN forge build
RUN cd contract && . /root/.bashrc && forge build
EXPOSE 8545

CMD (sleep 5 && . /root/.bashrc && cd contract/script && sh deploy.sh) & . /root/.bashrc && anvil



FROM node:${NODE_VERSION}-alpine as client-local

# Install pnpm.
RUN --mount=type=cache,target=/root/.npm \
    npm install -g pnpm@${PNPM_VERSION} &&\
    npm install -g typescript &&\
    npm install -g ts-node

WORKDIR /usr/src/app

# # Download dependencies as a separate step to take advantage of Docker's caching.
# # Leverage a cache mount to /root/.local/share/pnpm/store to speed up subsequent builds.
# # Leverage a bind mounts to package.json and pnpm-lock.yaml to avoid having to copy them into
# # into this layer.
RUN --mount=type=bind,source=client/package.json,target=client/package.json \
    --mount=type=bind,source=client/pnpm-lock.yaml,target=client/pnpm-lock.yaml \
    --mount=type=cache,target=/root/.local/share/pnpm/store \
    pnpm -C client install

# # Copy the rest of the source files into the image.
COPY client client
COPY .env .

# Run the application.
CMD cd client && pnpm listen


FROM node:${NODE_VERSION} as client-arbitrum-sepolia
RUN apt-get update
RUN --mount=type=cache,target=/root/.npm \
    npm install -g pnpm@${PNPM_VERSION} &&\
    npm install -g typescript &&\
    npm install -g ts-node
RUN apt-get install -y build-essential cmake libgmp-dev libsodium-dev nasm curl m4
RUN curl -L https://foundry.paradigm.xyz | bash
RUN . /root/.bashrc && foundryup

WORKDIR /usr/src/app
RUN --mount=type=bind,source=client/package.json,target=client/package.json \
    --mount=type=bind,source=client/pnpm-lock.yaml,target=client/pnpm-lock.yaml \
    --mount=type=cache,target=/root/.local/share/pnpm/store \
    pnpm -C client install

COPY contract contract
COPY .env .
RUN cd contract && . /root/.bashrc && forge build
COPY client client

CMD cd client && pnpm listen