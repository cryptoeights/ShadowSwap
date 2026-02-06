FROM --platform=linux/amd64 node:18-alpine

WORKDIR /app

COPY package.json ./
RUN npm install --production

COPY src/ ./src/

ENTRYPOINT ["node", "src/app.js"]
