################################################################################
# Dockerfile for the Election web container - installs and runs the Election
# node.js app
#
# Berlingske Media A/S, 2015
################################################################################

# We're using ubuntu 14.04 as a base for the image
FROM ubuntu:14.04

# Set maintainers.
MAINTAINER Daniel Kokott <dako@berlingskemedia.dk>

# Update and install required packages.
RUN apt-get update -y
RUN apt-get install -y wget

ENV NODE_VERSION v4.2.2

# Download and install node.js.
RUN wget -O - http://nodejs.org/dist/$NODE_VERSION/node-$NODE_VERSION-linux-x64.tar.gz \
    | tar xzf - --strip-components=1 --exclude="README.md" --exclude="LICENSE" \
    --exclude="ChangeLog" -C "/usr/local"

# Mount current dir as a volume containing all source code.
WORKDIR /election

COPY ./api /election/api
COPY ./fakedata /election/fakedata
COPY ./node_modules /election/node_modules
# COPY ./sync /election/sync

EXPOSE 8000

CMD ["node", "api/server.js"]
