FROM node:22-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY server.js index.html style.css ./
COPY js ./js
COPY server ./server
COPY img ./img
COPY assets ./assets
COPY sfx ./sfx
RUN mkdir -p /app/data

# Canlı çok oyunculu veri kalıcılığı (Oyuncu Bedesteni, Kervanlar, Loncalar, Dünya Boss'u)
VOLUME ["/app/data"]

ENV PORT=8080
ENV DATA_DIR=/app/data
EXPOSE 8080

CMD ["node", "server.js"]
