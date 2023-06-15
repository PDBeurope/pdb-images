FROM ubuntu:22.04

RUN apt-get update -y
RUN apt-get install -y curl xvfb

RUN curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
RUN apt-get install -y nodejs

RUN mkdir -p /pdbe-images
WORKDIR /pdbe-images
COPY package.json ./
RUN npm install  ||  { apt-get install -y python-is-python3 pkg-config build-essential libxi-dev libglew-dev && npm install; }
# Extra packages are needed to build `gl` library on arm64

COPY src ./src
COPY tsconfig.json ./
RUN npm run build

RUN mkdir -p /xvfb
ENV XVFB_DIR="/xvfb"

COPY docker ./docker

ENTRYPOINT ["bash", "/pdbe-images/docker/entrypoint.sh"]
