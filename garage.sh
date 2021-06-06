#!/bin/bash
cd garage
git fetch
git reset --hard origin/master
yarn install --prod
sudo NODE_ENV=production node src/server.js
