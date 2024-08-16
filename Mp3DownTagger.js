import {downloadSong} from "ytdl-mp3";
import csv from "csv-parser";
import fs from "fs";
import internetAvailable from "internet-available";
import {assignSongs2Download, checkAndClearInput, getSpotifySearchLinks, getSpotifyHTMLInfo, processSpotifyAutoResults, getYoutubeHTMLInfo, tagFile, checkAccessToken} from "./downTag.js"
import {Playlist} from "./playlist.js"
import {prepareString4Comparison, delay, titleIsPresent, checkAutoTagModePresence, isEmptyObject} from "./utils.js"
import path from "path";
import {fileURLToPath} from "url";



const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const config = JSON.parse(fs.readFileSync(__dirname + "/config.json"));				                                            //__dirname is the parent directory of the current file "./"
let songs2Download = [];
let downloadProgressVar = new Array(50);
let currentSong2Download = null;

init();

const playlist = new Playlist({
    playlist2Create: [],
    playlistProgressVar: new Array(50),
    matrixPath: null,
    sortingCriteria: "",
    sortingDirection: 0,
    globalOrders: "",
    globalTree: {},
    finalArrayRecursive: [],
    elements2Order: 0,
});



function init() {
    config.downtag_mode.output_music_directory = config.downtag_mode.output_music_directory.replaceAll("\\", "/");
    config.playlist_mode.output_playlist_directory = config.playlist_mode.output_playlist_directory.replaceAll("\\", "/");

    for (let i = 0; i < config.playlist_mode.folders2Scan.length; i++) {
        config.playlist_mode.folders2Scan[i] = config.playlist_mode.folders2Scan[i].replaceAll("\\", "/");

    }

    config.playlist_mode.phone_adaptation_settings.output_phone_playlist_directory = config.playlist_mode.phone_adaptation_settings.output_phone_playlist_directory.replaceAll("\\", "/");
    downloadProgressVar.fill(" ");

}

function checkMusicDirectory() {

    try {
        let fd = fs.opendirSync(config.downtag_mode.output_music_directory)
        fd.closeSync();
        return true;
    } catch (exception) {
        if (exception.errno === -4058) {
            console.log("$ The music directory provided doesn't exist\n");
        }
        return false;
    }

}

async function downTagMode() {

    fs.createReadStream(config.downtag_mode.csv_filename)
    .on("error", function(error) {
        if (error.errno === -4058) {
            console.log("$ The input file provided doesn't exist\n");
        }
    })
    .pipe(csv())
    .on("data", (data) => songs2Download.push(data))
    .on("end", async () => {                                                                                                    //Event that is raised when there is no more data to read

        assignSongs2Download(songs2Download);
        let checkedCleanedSongs = checkAndClearInput(songs2Download);

        if (checkedCleanedSongs.bool) {

            songs2Download = checkedCleanedSongs.songs2Download;

            let autoTagModePresence = checkAutoTagModePresence(songs2Download);

            if (autoTagModePresence) {
                await checkAccessToken();
            }

            if (!autoTagModePresence || (autoTagModePresence && config.downtag_mode.client_id.localeCompare("") !== 0 && config.downtag_mode.client_secret.localeCompare("") !== 0)) {

                for (let i = 0; i < songs2Download.length; i++) {

                    if (songs2Download[i].youtube_url.localeCompare("") != 0 && songs2Download[i].spotify_url.localeCompare("") != 0 && songs2Download[i].song.localeCompare("") != 0) {            //Downloader and tagger

                        if (!fs.existsSync(config.downtag_mode.output_music_directory + "/" + songs2Download[i].song + ".mp3")) {

                            console.log("Downloading " + songs2Download[i].song + ".mp3...");

                            const filename = await downloadSong(songs2Download[i].youtube_url, {
                                getTags: false,
                                outputDir: config.downtag_mode.output_music_directory,
                                audioFile: songs2Download[i].song
                            });


                            console.log("- " + songs2Download[i].song + ".mp3 downloaded");

                            console.log("Tagging " + songs2Download[i].song + ".mp3...");


                            let spotifyMetadata = {}


                            if (songs2Download[i].spotify_url.localeCompare("auto") == 0) {                                     //Get the first five links when auto mode is enabled

                                let spotifySearchLinks = await getSpotifySearchLinks(songs2Download[i].song, songs2Download[i].extra_information);

                                let spotifyAutoMetadata = []
                                for (let j = 0; j < config.downtag_mode.number_of_spotify_searches_auto_mode; j++) {
                                    spotifyAutoMetadata.push(await getSpotifyHTMLInfo(spotifySearchLinks[j]))
                                    await delay(config.downtag_mode.delay_seconds_spotify_searches + "000");
                                }

                                spotifyMetadata = processSpotifyAutoResults(songs2Download[i].song, spotifyAutoMetadata, songs2Download[i].extra_information);

                            }

                            else {
                                spotifyMetadata = await getSpotifyHTMLInfo(songs2Download[i].spotify_url);
                            }

                            if (Object.keys(spotifyMetadata).length !== 0) {

                                let coincidence = false;

                                for (let j = 0; j < spotifyMetadata.tracks.length && !coincidence; j++) {

                                    if (titleIsPresent(prepareString4Comparison(spotifyMetadata.tracks[j].songName), songs2Download[i].song)) {
                                        await tagFile(spotifyMetadata, songs2Download[i].song);
                                        coincidence = true;
                                    }

                                }

                                if (!coincidence) {
                                    console.log("$ This song can't be found on the spotify link you provided\n");
                                }

                            }

                            else {
                                console.log("$ This song can't be tagged in auto mode\n");
                            }

                        }

                        else {
                            console.log("$ " + songs2Download[i].song + ".mp3 already exists\n");                               //The user must provide an alternative name (i = 1, 2, 3...)
                        }

                    }

                    else if (songs2Download[i].youtube_url.localeCompare("") != 0 && songs2Download[i].spotify_url.localeCompare("") == 0) {                                                        //Downloader

                        const videoInfo = await getYoutubeHTMLInfo(songs2Download[i].youtube_url);

                        let mp3Name;
                        let fileNameProvided = false;

                        if (songs2Download[i].song.localeCompare("") != 0) {
                            fileNameProvided = true;
                            mp3Name = songs2Download[i].song;
                        }

                        else {
                            mp3Name = videoInfo.title.replace(/\s+/g, " ").trim();
                        }


                        if ((fileNameProvided && !fs.existsSync(config.downtag_mode.output_music_directory + "/" + mp3Name + ".mp3")) || (!fileNameProvided && !fs.existsSync(config.downtag_mode.output_music_directory + "/" + mp3Name + ".mp3"))) {

                            currentSong2Download = mp3Name;

                            console.log("Downloading " + currentSong2Download + ".mp3...");

                            const filename = await downloadSong(songs2Download[i].youtube_url, {
                                getTags: false,
                                outputDir: config.downtag_mode.output_music_directory,
                                audioFile: mp3Name
                            });

                            console.log("- " + mp3Name + ".mp3 downloaded\n");

                        }

                        else {
                            console.log("$ " + mp3Name + ".mp3 already exists\n");                                              //The user must provide an alternative name (i = 1, 2, 3...)
                        }

                    }


                    else if (songs2Download[i].youtube_url.localeCompare("") == 0 && songs2Download[i].spotify_url.localeCompare("") != 0) {                                                        //Tagger

                        if (fs.existsSync(config.downtag_mode.output_music_directory + "/" + songs2Download[i].song + ".mp3")) {

                            console.log("Tagging " + songs2Download[i].song + ".mp3...");

                            let spotifyMetadata = {}

                            if (songs2Download[i].spotify_url.localeCompare("auto") == 0) {                                     //Get the first five links when auto mode is enabled

                                let spotifySearchLinks = await getSpotifySearchLinks(songs2Download[i].song, songs2Download[i].extra_information);

                                let spotifyAutoMetadata = []
                                for (let j = 0; j < config.downtag_mode.number_of_spotify_searches_auto_mode; j++) {
                                    spotifyAutoMetadata.push(await getSpotifyHTMLInfo(spotifySearchLinks[j]))
                                    await delay(config.downtag_mode.delay_seconds_spotify_searches + "000");
                                }

                                spotifyMetadata = processSpotifyAutoResults(songs2Download[i].song, spotifyAutoMetadata, songs2Download[i].extra_information);

                            }

                            else {
                                spotifyMetadata = await getSpotifyHTMLInfo(songs2Download[i].spotify_url);

                            }

                            if (Object.keys(spotifyMetadata).length !== 0) {

                                let coincidence = false;

                                for (let j = 0; j < spotifyMetadata.tracks.length && !coincidence; j++) {

                                    if (titleIsPresent(prepareString4Comparison(spotifyMetadata.tracks[j].songName), songs2Download[i].song)) {
                                        await tagFile(spotifyMetadata, songs2Download[i].song);
                                        coincidence = true;
                                    }

                                }

                                if (!coincidence) {
                                    console.log("$ This song can't be found on the spotify link you provided\n");
                                }
                            }

                            else {
                                console.log("$ This song can't be tagged in auto mode\n");
                            }

                        }

                        else {
                            console.log("$ " + songs2Download[i].song + ".mp3 doesn't exist\n");                                //The user must provide an alternative name (i = 1, 2, 3...)
                        }

                    }

                    else {
                        console.log("$ Csv file format is not correct");
                    }

                }

            }

        }

        else {
            console.log("$ Some input value is not correct. Make sure you have filled every field properly and you don't have ilegal characters as filenames");
        }

    })

}



function playlistMode() {

    fs.createReadStream(config.playlist_mode.csv_playlist_filename)
    .on("error", function(error) {
        if (error.errno === -4058) {
            console.log("$ The input file provided doesn't exist\n");
        }
    })
    .pipe(csv())
    .on("data", (data) => playlist.playlist2Create.push(data))
    .on("end", () => {

        let checkedCleanedPlaylist = playlist.checkAndClearInput();

        if (checkedCleanedPlaylist) {

            playlist.playlistProgressVar.fill(" ");
            playlist.matrixPath = new Array(playlist.playlist2Create.length);

            for (let i = 0; i < playlist.playlist2Create.length; i++) {

                playlist.matrixPath[i] = [];                                                                                    //Each position will be an array

                let playlistName = playlist.playlist2Create[i].playlist_name;

                if (playlistName === undefined) {
                    playlistName = playlist.createPlayListName();
                }

                else {
                    playlistName = playlistName + ".m3u";
                }

                if (config.playlist_mode.substitute_playlist_files || !fs.existsSync(config.playlist_mode.output_playlist_directory + "/" + playlistName)) {

                    config.playlist_mode.folders2Scan.forEach(folder => {                                                       //Alphabetic sorting, etc

                        let files = fs.readdirSync(folder);



                        console.log("Creating " + playlistName + "...");

                        for (let j = 0; j < files.length; j++) {

                            playlist.printPlaylistCreationProgress(j, files.length);

                            if (playlist.includeFileExtensions(files[j])) {                                                     //Filter music files
                                let path = (folder + "/" + files[j]).replaceAll("\\", "/");
                                playlist.includeSong(path, i);
                                playlist.elements2Order = playlist.matrixPath[i].length;
                            }

                        }

                    });

                    console.log("Sorting " + playlistName);

                    let sortedArray = playlist.order(i);

                    playlist.finalArrayRecursive = [];
                    playlist.globalTree = {};
                    playlist.sortingCriteria = "";
                    playlist.sortingDirection = 0;

                    playlist.createPlaylist(sortedArray, playlistName);

                    console.log("+ " + playlistName + " was created\n");

                    if (config.playlist_mode.phone_adaptation_settings.phone_playlist) {
                        console.log("+ " + playlistName + " - Phone was created\n");
                    }

                }

                else {
                    console.log("$ This playlist already exists\n");
                }

            }

        }

        else {
            console.log("$ Some input value is not correct. Make sure you have filled every field properly and you don't have ilegal characters as filenames");
        }

    })

}


async function main() {

    if (checkMusicDirectory()) {

        if (process.argv.length === 3 && process.argv[2].localeCompare("-downtag") == 0) {

            try {
                await internetAvailable();
                downTagMode();
            }

            catch (exception) {
                console.log("$ No internet");
            }

        }

        else if (process.argv.length === 3 && process.argv[2].localeCompare("-playlist") == 0) {
            playlistMode();
        }

        else if (process.argv.length === 3 && process.argv[2].localeCompare("-help") == 0) {

            console.log("Mp3DownTagger 1.0.0. A music downloader and tagger program that is also capable of creating playlists with powerful filters.\n");
            console.log("Usage: Mp3DownTagger [OPTION]\n");
            console.log("-downtag\tDownload and tag new songs, simply download, or simply tag an existing song.");
            console.log("-playlist\tCreate a playlist applying powerful filters.");
            console.log("-help\t\tPrint this help.");

        }

        else {

            console.log("Usage: Mp3DownTagger [OPTION]\n");
            console.log("Try \"Mp3DownTagger -help\" for more options.");

        }

    }

}

main();
