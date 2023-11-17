FROM ubuntu:latest

ENV TOKEN=
ENV RUNNER_NAME=
ENV RUNNER_URL="https://github.com/wulfland/GitHubActionsCookbook"
ENV GH_RUNNER_PLATFORM="linux-arm64"
ENV GH_RUNNER_VERSION="2.311.0"
ENV LABELS="self-hosted,ARM64,Linux"
ENV RUNNER_GROUP="Default"

ARG DEBIAN_FRONTEND=noninteractive

RUN apt-get -y update && \
  apt-get upgrade -y && \
  useradd -m docker && \
  apt-get install -y --no-install-recommends curl ca-certificates && \
  mkdir -p /opt/hostedtoolcache /home/docker/actions-runner && \
  curl -L https://github.com/actions/runner/releases/download/v${GH_RUNNER_VERSION}/actions-runner-${GH_RUNNER_PLATFORM}-${GH_RUNNER_VERSION}.tar.gz -o /home/docker/actions-runner/actions-runner.tar.gz && \
  tar xzf /home/docker/actions-runner/actions-runner.tar.gz -C /home/docker/actions-runner && \
  chown -R docker /home/docker && \
  /home/docker/actions-runner/bin/installdependencies.sh

USER docker

WORKDIR /home/docker/actions-runner

CMD if [ -z "$TOKEN" ]; then echo 'TOKEN is not set'; exit 1; fi && \
  if [ -z "$RUNNER_NAME" ]; then echo 'RUNNER_NAME is not set'; exit 1; fi && \
  ./config.sh --url "${RUNNER_URL}" --token "${TOKEN}" --name "${RUNNER_NAME}" --work "_work" --labels "${LABELS}" --runnergroup "${RUNNER_GROUP}" --unattended --ephemeral && \
  ./run.sh