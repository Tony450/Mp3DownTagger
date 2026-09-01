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
        sudo pacman -S git --noconfirm
    fi

    if [[ $(command -v apt) ]]; then
        sudo apt install -y git
    fi

    if [[ $(command -v dnf) ]]; then
        sudo dnf install -y git
    fi

fi

#Node install
if [[ ! $(command -v node) ]]; then

    if [[ $(command -v pacman) ]]; then
        sudo pacman -Syy
        sudo pacman -S nodejs npm pipx --noconfirm

    elif [[ $(command -v apt) ]]; then
        sudo apt update
        sudo apt install -y nodejs npm pipx

    elif [[ $(command -v dnf) ]]; then
        sudo dnf install -y nodejs npm pipx

    else 
        echo "Please search for installation instructions for your GNU/Linux distribution"        
    fi

    pipx ensurepath
    pipx install "yt-dlp[curl-cffi]"

fi

#MegaSync install
if [[ ! $(command -v megasync) ]]; then

    if [[ $(command -v pacman) ]]; then

        sudo pacman-key --init
        sudo pacman-key --populate archlinux

        sudo pacman-key --recv-keys B01C811880480C854C73EC7E1A664B787094A482
        sudo pacman-key --lsign-key B01C811880480C854C73EC7E1A664B787094A482

        echo -e "\n[DEB_Arch_Extra]\nSigLevel = Required TrustedOnly\nServer = https://mega.nz/linux/repo/Arch_Extra/\$arch/\n" | sudo tee -a /etc/pacman.conf

        sudo pacman -Syy

        sudo pacman -S megasync dolphin-megasync --noconfirm

    elif [[ $(command -v apt) ]]; then

        curl -fsSL https://mega.nz/keys/MEGA_signing.key | sudo gpg --dearmor -o /etc/apt/keyrings/mega.gpg
        echo "deb [signed-by=/etc/apt/keyrings/mega.gpg] https://mega.nz/linux/repo/Debian_13/ ./" | sudo tee /etc/apt/sources.list.d/megasync.list

        sudo apt update
        sudo apt install -y megasync

    elif [[ $(command -v dnf) ]]; then

        echo -e "[megasync]\nname=MEGAsync repository\nbaseurl=https://mega.nz/linux/repo/Fedora_\$releasever/\nenabled=1\ngpgcheck=1\ngpgkey=https://mega.nz/keys/MEGA_signing.key" | sudo tee /etc/yum.repos.d/megasync.repo
        sudo dnf install -y megasync

    else 
        echo "Please search for installation instructions for your GNU/Linux distribution"        
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
