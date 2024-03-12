# syntax=docker/dockerfile:1

ARG NODE_VERSION=21.3.0
ARG PNPM_VERSION=8.12.0


FROM node:${NODE_VERSION} as client
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

CMD pnpm -C client listen