FROM python:3.12-alpine

RUN apk add --no-cache \
    docker-cli \
    curl

WORKDIR /app

COPY server.py index.html ./

EXPOSE 3001

CMD ["python", "server.py"]
