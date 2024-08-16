#!/bin/bash

default_config=true

git clone https://github.com/Tony450/Mp3DownTagger /tmp/Mp3DownTagger

cd /tmp/Mp3DownTagger
sudo rsync -a -I . /opt/Mp3DownTagger --exclude Installer/GNU\ Linux/update.sh
cd /opt/Mp3DownTagger/
sudo chmod +x Mp3DownTagger
cd Installer/GNU\ Linux
sudo chmod +x *.sh
cd /opt/Mp3DownTagger/
sudo chmod 606 config.json
sudo rm DownTagInput.csv PlaylistInput.csv .gitignore
sudo rm -r -f .git

cd /tmp/Mp3DownTagger

#Default Linux config file
if [[ $default_config = true ]]; then
    cd default-configs
    sudo chmod 606 config-linux.json
    sudo cp config-linux.json /opt/Mp3DownTagger/config.json
    user=$(whoami)
    sudo sed -i -e "s/user/${user}/g" /opt/Mp3DownTagger/config.json
    cd
fi



