#!/bin/bash

cd ../..
default_config=true
working_directory=$(pwd)

#Program directory
sudo mkdir /opt/Mp3DownTagger
sudo cp -r * /opt/Mp3DownTagger/
cd /opt/Mp3DownTagger/
sudo chmod +x Mp3DownTagger
cd Installer/GNU\ Linux
sudo chmod +x *.sh
cd /opt/Mp3DownTagger/
sudo chmod 606 config.json
sudo rm DownTagInput.csv PlaylistInput.csv
cd "$working_directory"

#Input directory
mkdir ~/Music/Mp3DownTagger
cp DownTagInput.csv PlaylistInput.csv ~/Music/Mp3DownTagger/
sudo ln -s -f /opt/Mp3DownTagger/config.json ~/Music/Mp3DownTagger/config.json

#Log directory
sudo mkdir /var/log/Mp3DownTagger && sudo touch /var/log/Mp3DownTagger/Mp3DownTagger.log
sudo chmod 666 /var/log/Mp3DownTagger/Mp3DownTagger.log

#Environment variables config
if [[ $(ls -al ~/ | grep .zshrc) ]]; then
    
    if [[ ! $(grep "Mp3DownTagger" ~/.zshrc) ]]; then
        echo -e "\nexport Mp3DownTagger=/opt/Mp3DownTagger/\nexport PATH=\$PATH:/opt/Mp3DownTagger/" >> ~/.zshrc
    fi

fi

if [[ $(ls -al ~/ | grep .bashrc) ]]; then

    if [[ ! $(grep "Mp3DownTagger" ~/.bashrc) ]]; then
        echo -e "\nexport Mp3DownTagger=/opt/Mp3DownTagger/\nexport PATH=\$PATH:/opt/Mp3DownTagger/" >> ~/.bashrc
    fi

fi


#Default Linux config file
if [[ $default_config = true ]]; then
    cd default-configs
    sudo chmod 606 config-linux.json
    sudo cp config-linux.json /opt/Mp3DownTagger/config.json
    user=$(whoami)
    sudo sed -i -e "s/user/${user}/g" /opt/Mp3DownTagger/config.json
    cd
fi

#Git install
if [[ ! $(command -v git) ]]; then

    if [[ $(command -v pacman) ]]; then
        sudo pacman -S git
    fi
    
    if [[ $(command -v apt) ]]; then
        sudo apt install git 
    fi

    if [[ $(command -v apt-get) ]]; then
        sudo apt-get install git
    fi

    if [[ $(command -v dnf) ]]; then
        sudo dnf install git
    fi

    if [[ $(command -v yum) ]]; then
        sudo yum install git
    fi

    if [[ $(command -v zypper) ]]; then
        sudo zypper install git
    fi

    if [[ $(command -v emerge) ]]; then
        sudo emerge install git
    fi

    if [[ $(command -v apk) ]]; then
        sudo apk add git
    fi

    if [[ $(command -v brew) ]]; then
        sudo brew install git
    fi

fi

#Node install
if [[ ! $(command -v node) ]]; then

    if [[ $(command -v pacman) ]]; then
        sudo pacman -S nodejs npm
    fi
    
    if [[ $(command -v apt) ]]; then
        sudo apt install nodejs npm 
    fi

    if [[ $(command -v apt-get) ]]; then
        sudo apt-get install nodejs npm
    fi

    if [[ $(command -v dnf) ]]; then
        sudo dnf install nodejs npm
    fi

    if [[ $(command -v yum) ]]; then
        sudo yum install nodejs npm
    fi

    if [[ $(command -v zypper) ]]; then
        sudo zypper install nodejs npm
    fi

    if [[ $(command -v emerge) ]]; then
        sudo emerge install nodejs npm
    fi

    if [[ $(command -v apk) ]]; then
        sudo apk add nodejs npm
    fi

    if [[ $(command -v brew) ]]; then
        sudo brew install node
    fi

fi

#MegaSync install
if [[ ! $(command -v megasync) ]]; then

    if [[ $(command -v paru) ]]; then
        paru -S megasync-bin

    elif [[ $(command -v yay) ]]; then
        yay -S megasync-bin

    else 
        echo "Go to https://mega.io/desktop#download and follow specific instructions to download MegaSync depending on what distribution you are running"
    fi
    
fi

#Modern CSV install
if [[ ! $(command -v moderncsv) ]]; then
    cd /tmp
    curl -O https://www.moderncsv.com/release/ModernCSV-Linux-v2.0.8.tar.gz
    tar -xvzf ModernCSV-Linux-v2.0.8.tar.gz
    cd moderncsv2.0.8 && chmod +x install.sh && sudo ./install.sh
    cd "$working_directory"
fi

#Node modules installation
cd /opt/Mp3DownTagger
sudo npm install

#Substitute ytdl library
cd /opt/Mp3DownTagger/
cd ytdl-mp3-fix
sudo cp -f index.js index.mjs ../node_modules/ytdl-mp3/dist/
sudo cp -f package.json ../node_modules/ytdl-mp3/

