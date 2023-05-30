FROM amd64/ubuntu:22.04

RUN apt-get update -y
RUN apt-get install -y build-essential libxi-dev libglu1-mesa-dev libglew-dev pkg-config python-is-python3 curl xvfb

RUN curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
RUN apt-get install -y nodejs

RUN mkdir -p /pdbe-images
RUN mkdir -p /xvfb
ENV XVFB_DIR="/xvfb"
WORKDIR /pdbe-images
COPY package.json ./
RUN npm install

COPY src ./src
COPY tsconfig.json ./
RUN npm run build

COPY docker-entrypoint.sh ./

ENTRYPOINT ["bash", "/pdbe-images/docker-entrypoint.sh"]
