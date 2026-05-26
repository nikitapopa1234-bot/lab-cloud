FROM debian:12-slim

RUN apt-get update && apt-get install -y \
    curl \
    postgresql \
    postgresql-client \
    && curl -fsSL https://deb.nodesource.com/setup_18.x | bash - \
    && apt-get install -y nodejs \
    && apt-get clean

USER postgres
RUN /etc/init.d/postgresql start && \
    psql --command "CREATE USER appuser WITH PASSWORD 'parola123';" && \
    psql --command "CREATE DATABASE userdb OWNER appuser;"

USER root
WORKDIR /app
COPY package.json .
RUN npm install
COPY server.js .

EXPOSE 3000
CMD service postgresql start && node server.js