FROM node:22-alpine
# The runtime never needs npm or corepack: dropping them removes the base image's bundled npm dependencies from the attack surface
# (and from the Trivy scan, which fails on fixable HIGH findings).
RUN rm -rf /usr/local/lib/node_modules/npm /usr/local/lib/node_modules/corepack /usr/local/bin/npm /usr/local/bin/npx /usr/local/bin/corepack
WORKDIR /app
COPY server.mjs .
USER node
EXPOSE 3000
CMD ["node", "server.mjs"]
