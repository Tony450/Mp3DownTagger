#!/bin/bash

# working_directory=$(pwd)

#Node modules installation
cd /c/Program\ Files/Mp3DownTagger/
npm install


#Substitute ytdl library
cd /c/Program\ Files/Mp3DownTagger/
cd ytdl-mp3-fix
cp -f index.js index.cjs ../node_modules/ytdl-mp3/dist/