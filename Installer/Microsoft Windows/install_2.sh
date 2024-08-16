#!/bin/bash

# working_directory=$(pwd)

#Node modules installation
cd /c/Program\ Files/Mp3DownTagger/
npm install


#Substitute ytdl library
cd /c/Program\ Files/Mp3DownTagger/
cd ytdl-mp3-fix
cp -f index.js index_w.mjs ../node_modules/ytdl-mp3/dist/
cp -f package.json ../node_modules/ytdl-mp3/

cd ../node_modules/ytdl-mp3/dist/
mv index_w.mjs index.mjs
