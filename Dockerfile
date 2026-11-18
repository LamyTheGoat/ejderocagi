FROM node:22-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY server.js index.html style.css style_mobile.css ./
COPY js ./js
COPY server ./server
COPY img ./img
COPY assets ./assets
COPY sfx ./sfx
# Ejder Ocağı 2.0: sayfa, betikler, stiller ve çizimler. Sunucu da eo2/js altından zindan ve arena verisini okur.
# tools/, docs/, trailer/ ve arenalar/ (kaynak çizimler) pakete girmez.
COPY eo2/index.html eo2/gizlilik.html eo2/kosullar.html ./eo2/
COPY eo2/js ./eo2/js
COPY eo2/css ./eo2/css
COPY eo2/assets ./eo2/assets
RUN mkdir -p /app/data

# Canlı çok oyunculu veri kalıcılığı (Oyuncu Bedesteni, Kervanlar, Loncalar, Dünya Boss'u)
VOLUME ["/app/data"]

ENV PORT=8080
ENV DATA_DIR=/app/data
EXPOSE 8080

CMD ["node", "server.js"]
