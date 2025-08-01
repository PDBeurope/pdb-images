FROM ubuntu:22.04

RUN apt-get update -y
RUN apt-get install -y curl xvfb
RUN curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
RUN apt-get install -y nodejs
RUN apt-get install -y python-is-python3 pkg-config build-essential libxi-dev libglew-dev

RUN mkdir -p /pdb-images
WORKDIR /pdb-images

COPY package.json ./
RUN npm install

COPY src ./src
COPY tsconfig.json ./
RUN npm run build

RUN npm install -g .

RUN mkdir -p /xvfb
ENV XVFB_DIR="/xvfb"

COPY docker ./docker

ENTRYPOINT ["bash", "/pdb-images/docker/entrypoint.sh"]
