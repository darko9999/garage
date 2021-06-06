#!/bin/bash
cd garage
git pull
sudo NODE_ENV=production node src/server.js
