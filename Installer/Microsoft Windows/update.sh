#!/bin/bash

default_config=true

cd
cd Downloads
git clone https://github.com/Tony450/Mp3DownTagger
cd Mp3DownTagger
rsync -a -I . /c/Program\ Files/Mp3DownTagger --exclude Installer/Microsoft\ Windows/update.sh
cp Installer/Microsoft\ Windows/Mp3DownTagger.bat /c/Program\ Files/Mp3DownTagger
cd /c/Program\ Files/Mp3DownTagger/
rm DownTagInput.csv PlaylistInput.csv Mp3DownTagger .gitignore
rm -r -f .git

cd
cd Downloads/Mp3DownTagger


#Default Windows config file
if [[ $default_config = true ]]; then
    cd default-configs
    cp config-windows.json /c/Program\ Files/Mp3DownTagger/config.json
    user=$(whoami)
    sed -i -e "s/user/${user}/g" /c/Program\ Files/Mp3DownTagger/config.json
    cd
fi

