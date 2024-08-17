FROM node:current-alpine
WORKDIR /app

RUN apt-get update && \
apt-get upgrade -y --no-install-recommends && \
apt-get clean

COPY package*.json .
RUN npm ci

ENV NODE_ENV=production
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

COPY . .
CMD ["npm", "start"]