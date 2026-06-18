FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

ENV HOST=0.0.0.0
ENV PORT=8123

EXPOSE 8123

CMD ["npm", "run", "serve"]
