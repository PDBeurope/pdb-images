FROM ubuntu:22.04

RUN apt-get update -y
RUN apt-get install -y curl xvfb
RUN curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
RUN apt-get install -y nodejs
# Extra packages are needed to build `gl` library on arm64 architecture (not needed on amd64 aka x86_64):
RUN test "$(arch)" = "x86_64" || apt-get install -y python-is-python3 pkg-config build-essential libxi-dev libglew-dev

RUN mkdir -p /pdbe-images
WORKDIR /pdbe-images

RUN npm install -g pdbe-images

RUN mkdir -p /xvfb
ENV XVFB_DIR="/xvfb"

COPY docker ./docker

ENTRYPOINT ["bash", "/pdbe-images/docker/entrypoint.sh"]
