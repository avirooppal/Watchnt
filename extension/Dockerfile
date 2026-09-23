FROM node:22-alpine@sha256:b6f26b36c8ff49624cfdac716b8ea1138d606df02586a77d364bb5536a634f85
WORKDIR /build
COPY extension/package*.json ./
RUN npm ci
COPY extension/ ./
RUN npm run build
# Export the compiled extension for Chrome's one-time Load unpacked step.
CMD ["sh", "-c", "cp -a dist/. /output/ && echo 'WatchNT extension ready: load extension/dist in chrome://extensions'"]
