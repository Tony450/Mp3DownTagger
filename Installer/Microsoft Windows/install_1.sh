#!/bin/bash

cd ../..
default_config=true
working_directory=$(pwd)


#Program directory
mkdir /c/Program\ Files/Mp3DownTagger
cp -r * /c/Program\ Files/Mp3DownTagger
rm /c/Program\ Files/Mp3DownTagger/Mp3DownTagger
cp Installer/Microsoft\ Windows/Mp3DownTagger.bat /c/Program\ Files/Mp3DownTagger
cd /c/Program\ Files/Mp3DownTagger
rm DownTagInput.csv PlaylistInput.csv
cd "$working_directory"

#Input directory and log file
cd
mkdir Music/Mp3DownTagger
cd Music/Mp3DownTagger
mp3downtagger_music_directory=$(pwd)
cd "$working_directory"
cp DownTagInput.csv PlaylistInput.csv "$mp3downtagger_music_directory"
cd
cd "$mp3downtagger_music_directory"
touch Mp3DownTagger.log
cd "$working_directory"


#Default windows config file
if [[ $default_config = true ]]; then
    cd default-configs
    cp config-windows.json /c/Program\ Files/Mp3DownTagger/config.json
    user=$(whoami)
    sed -i -e "s/user/${user}/g" /c/Program\ Files/Mp3DownTagger/config.json
    cd
fi


cd Downloads

#Node install
curl -O --insecure https://nodejs.org/dist/v22.6.0/node-v22.6.0-x64.msi
powershell -command ".\node-v22.6.0-x64.msi"
sleep 5

#MegaSync install
curl -O --insecure https://mega.nz/MEGAsyncSetup64.exe
./MEGAsyncSetup64.exe

#Modern CSV install
curl -O --insecure https://www.moderncsv.com/release/ModernCSV-Win-v2.0.8.exe
./ModernCSV-Win-v2.0.8.exe


#Addition of Rsync to Git Bash
cd "$working_directory"
cd Installer/Microsoft\ Windows/Rsync
cp * /c/Program\ Files/Git/usr/bin/
