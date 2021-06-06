#!/bin/bash
cd garage
git pull
yarn install --prod
sudo NODE_ENV=production node src/server.js
