# ENS trivial pass — synthetic-only demo. Zero dependencies, Node >= 18.
FROM node:24-alpine
WORKDIR /app
COPY server.mjs package.json ./
COPY public/ ./public/
COPY judge/ ./judge/
COPY fixtures/ ./fixtures/
ENV PORT=4173
EXPOSE 4173
CMD ["node", "server.mjs"]
