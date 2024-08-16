import fs from "fs";
import fetch from "isomorphic-unfetch";
import NodeID3 from "node-id3";
import imageDownloader from "image-downloader";
import node_fetch from "node-fetch";
import spotify from "spotify-url-info";
import SpotifyWebApi from "spotify-web-api-node";
import path from "path";
import {fileURLToPath} from "url";
import {prepareString4Comparison, delay, formatTitleTag, titleIsPresent, formatTitleSpotify, isEmptyObject} from "./utils.js"




const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const config = JSON.parse(fs.readFileSync(__dirname + "/config.json"));				                                         //__dirname is the parent directory of the current file "./"
let spotifyApi = new SpotifyWebApi({
    clientId: config.downtag_mode.client_id,
    clientSecret: config.downtag_mode.client_secret,
    redirectUri: config.downtag_mode.redirectUri
});
const { getData } = spotify(fetch);


let songs2Download;

function assignSongs2Download(mainSongs2Download) {
    songs2Download = mainSongs2Download;
}


function checkAndClearInput(songs2Download) {

    function includeHeaders(x) {
        return (x.youtube_url.localeCompare("youtube_url") != 0 || x.spotify_url.localeCompare("spotify_url") != 0 || x.song.localeCompare("filename") != 0 || x.genre.localeCompare("genre") != 0 || x.extra_information.localeCompare("extra_information") != 0)
    }

    try {

        songs2Download = songs2Download.filter((x) => Object.entries(x).length !== 0);                                       //Filter empty lines

        if (songs2Download[0].youtube_url === undefined || songs2Download[0].spotify_url === undefined || songs2Download[0].song === undefined || songs2Download[0].genre === undefined || songs2Download[0].extra_information === undefined) {           //Filter if these fields are not included in csv file
            return {bool: false, songs2Download: []};
        }

        songs2Download = songs2Download.filter(includeHeaders);                                                              //Filter the lines equals to line 0 in csv
        songs2Download = songs2Download.filter((x) => x.song.substring(0, 2).localeCompare(config.comment_character) != 0);
        songs2Download = songs2Download.filter((x) => !(x.youtube_url.localeCompare("") == 0 && x.spotify_url.localeCompare("") == 0));

        for (let i = 0; i < songs2Download.length; i++) {
            songs2Download[i].youtube_url = songs2Download[i].youtube_url.replace(/\s+/g, " ").trim();
            songs2Download[i].spotify_url = songs2Download[i].spotify_url.replace(/\s+/g, " ").trim();
            songs2Download[i].song = songs2Download[i].song.replace(/\s+/g, " ").trim().split(".mp3")[0].replace(/(^\w{1})|(\s+\w{1})/g, letter => letter.toUpperCase());
            songs2Download[i].genre = songs2Download[i].genre.replace(/\s+/g, " ").trim();
            songs2Download[i].extra_information = songs2Download[i].extra_information.replace(/\s+/g, " ").trim();
        }

        for (let i = 0; i < songs2Download.length; i++) {

            if ((songs2Download[i].youtube_url.localeCompare("") != 0 && !songs2Download[i].youtube_url.includes("youtube.com/watch?v=")) ||
                (songs2Download[i].spotify_url.localeCompare("") != 0 && !(songs2Download[i].spotify_url.includes("open.spotify.com/") || songs2Download[i].spotify_url.includes("auto")) )) {
                return {bool: false, songs2Download: []};
            }

        }

        for (let i = 0; i < songs2Download.length; i++) {

            if (songs2Download[i].song.includes("<") || songs2Download[i].song.includes(">") || songs2Download[i].song.includes(":") || songs2Download[i].song.includes("\"") || songs2Download[i].song.includes("/") || songs2Download[i].song.includes("\\") || songs2Download[i].song.includes("|") || songs2Download[i].song.includes("?") || songs2Download[i].song.includes("*")) {
                return {bool: false, songs2Download: []};
            }

        }


        return {bool: true, songs2Download: songs2Download};


    } catch (exception) {
        return {bool: false, songs2Download: []};
    }

}


async function getSpotifySearchLinks(song, extraInformation) {

    let spotifySearchLinks = [];

    let data = await searchTracksHandler(spotifyApi, song, extraInformation);

    for (let i = 0; i < config.downtag_mode.number_of_spotify_searches_auto_mode; i++) {
        spotifySearchLinks.push("https://open.spotify.com/album/" + data.body.tracks.items[i].album.id);
    }

    return spotifySearchLinks;

}



async function getSpotifyHTMLInfo(spotifyURL) {

	let spotifyMetadata = {};

    let response = await websiteFetchHandler(spotifyURL);

	const data = await response.text();

	let startIndex = data.indexOf("<title>");
	let endIndex = data.indexOf("</title>");

	let album_typeText = data.substring(startIndex, endIndex);

	if (album_typeText.includes("- Single ")) {
		spotifyMetadata.album_type = "single";
	}

	else if (album_typeText.includes("- Album ") || album_typeText.includes("- EP ")) {
		spotifyMetadata.album_type = "album";
	}

    else {
        spotifyMetadata.album_type = "undefined";
    }

	startIndex = data.indexOf("release_date");
	endIndex = startIndex + 34;			                                                                                     //Offset

	let date_text = data.substring(startIndex, endIndex);
	date_text = date_text.replaceAll("\"","")

	spotifyMetadata.release_date = date_text.split("content=")[1];


    startIndex = data.indexOf("- Album by");

    if (startIndex === -1) {

        startIndex = data.indexOf("- Single by");

        if (startIndex === -1) {

            startIndex = data.indexOf("- EP by");

        }
    }

    let albumartistIndex = startIndex;

    endIndex = startIndex;
    startIndex = startIndex - 70;

    let aux_album = data.substring(startIndex, endIndex);

    spotifyMetadata.album = aux_album.substring(aux_album.indexOf("<title>")).trim().replace("<title>", "").toLowerCase().replace(/(^\w{1})|(\s+\w{1})/g, letter => letter.toUpperCase()).replaceAll("&#x27;", "'").replaceAll("&amp;", "&").replaceAll(/\u2019/g, "'");

    spotifyMetadata.album_artist = data.substring(albumartistIndex, data.indexOf("|")).replaceAll("&amp;", "&").replace("- Album by ", "").replace("- EP by ", "").trim();

    startIndex = data.indexOf("https://i.scdn.co/image/");
    endIndex = startIndex + 80;

    let aux_url_image = data.substring(startIndex, endIndex);

    let auxIndex = aux_url_image.indexOf("/>") - 1;


    spotifyMetadata.imageURL = aux_url_image.substring(0, auxIndex);


    let numberSongs = data.match(/aria-label=/g).length;

    let data2 = data;

    let tracks = []



    for (let i = 0; i < numberSongs; i++) {                                                                                  //Songs

        let auxIndex = data2.indexOf("aria-label=");

        if (i < 4) {
            data2 = data2.substring(auxIndex + 20);

        }

        if (i >= 4) {

            let startIndex = data2.indexOf("aria-label=");
            let endIndex = data2.indexOf("data-testid=\"track-row");


            let songName = data2.substring(startIndex, endIndex - 2).replace("aria-label=\"", "").replaceAll("&#x27;", "'").replaceAll(/\u2019/g, "'");

            let endIndexArtist = data2.indexOf("</p></div>");
            let auxTextArtists = data2.substring(endIndexArtist - 150, endIndexArtist);

            let text2Log = "------------------------" + songName + "------------------------\n" + auxTextArtists + "\n\n";

            fs.appendFileSync(config.downtag_mode.logFile, text2Log, "utf8");

            let artists = "";

            if (!auxTextArtists.includes("<span><a")) {

                let startIndexArtirts = auxTextArtists.indexOf(">") + 1;
                artists = auxTextArtists.substring(startIndexArtirts, endIndexArtist);

            }

            else {

                auxTextArtists = auxTextArtists.substring(auxTextArtists.indexOf("<span><a") + 8, auxTextArtists.indexOf("</a></span>"));

                let startIndexArtirts = auxTextArtists.indexOf(">") + 1;
                artists = auxTextArtists.substring(startIndexArtirts);

            }

            artists = artists.replaceAll("&#x27;", "`");
            tracks.push({songName, artists});
            data2 = data2.substring(endIndexArtist + 10);

        }


        spotifyMetadata.tracks = tracks;

    }

    await delay(config.downtag_mode.delay_seconds_spotify_searches + "000");
    spotifyMetadata = await addSpotifyArtists(spotifyURL, spotifyMetadata);

	return spotifyMetadata;

}


async function addSpotifyArtists(spotify_url, spotifyMetadata) {

    let spotifyURLInfo = await searchSpotifyArtistsHandler(spotify_url);

    let spotifyArtist = [];

    for (let i = 0; i < spotifyURLInfo.trackList.length; i++) {
        spotifyArtist.push(spotifyURLInfo.trackList[i]["subtitle"]);
    }

    for (let i = 0; i < spotifyMetadata.tracks.length; i++) {
        spotifyMetadata.tracks[i].artists = spotifyArtist[i];
    }

    return spotifyMetadata;

}


function processSpotifyAutoResults(song, spotifyAutoMetadata, extraInformation) {                                            //Extra information must be separated with commas

    function checkExtraInformationPresence(artists, extraInformation) {

        if (extraInformation.localeCompare("") !== 0) {

            let artistsString = prepareString4Comparison(artists.join(" "));
            let extraInformationWords = extraInformation.split(", ");

            for (let i = 0; i < extraInformationWords.length; i++) {

                if (artistsString.includes(prepareString4Comparison(extraInformationWords[i]))) {
                    return true;
                }

            }

            return false;
        }

        else {
            return false;
        }

    }

    function getSpotifyTitle(spotifyMetadata) {

        let titleFormated = formatTitleTag(song);
        let words = formatTitleSpotify(titleFormated).split(" ");

        for (let i = 0; i < words.length; i++) {
            words[i] = prepareString4Comparison(words[i]);
        }

        let spotifyTitle = ""

        for (let i = 0; i < spotifyMetadata.tracks.length; i++) {

            let coincidence = true;
            spotifyTitle = prepareString4Comparison(spotifyMetadata.tracks[i].songName);

            for (let j = 0; j < words.length && coincidence; j++) {

                if (!spotifyTitle.includes(words[j])) {
                    coincidence = false;
                }

            }

            if (coincidence) {
                break;
            }

        }

        return spotifyTitle;

    }


    for (let i = 0; i < spotifyAutoMetadata.length; i++) {

        let auxArtists = [];

        for (let j = 0; j < spotifyAutoMetadata[i].tracks.length; j++) {
            auxArtists.push(spotifyAutoMetadata[i].tracks[j].artists);
        }

        if (spotifyAutoMetadata[i].album_type.includes("album") && !(prepareString4Comparison(song).includes("remix"))) {
            spotifyAutoMetadata[i].priority = 1;
        }

        else if (spotifyAutoMetadata[i].album_type.includes("single") && !(prepareString4Comparison(song).includes("remix"))) {
            spotifyAutoMetadata[i].priority = 2;
        }

        if (spotifyAutoMetadata[i].album_type.includes("single") && (prepareString4Comparison(song).includes("remix"))) {    //Remix cases
            spotifyAutoMetadata[i].priority = 1;
        }

        if (!(prepareString4Comparison(song).includes("remix")) && (prepareString4Comparison(getSpotifyTitle(spotifyAutoMetadata[i])).includes("remix"))) {                                 //It must not be case sensitive
            spotifyAutoMetadata[i].priority = -1;
        }

        if (!checkExtraInformationPresence(auxArtists, extraInformation)) {
            spotifyAutoMetadata[i].priority = -1;
        }

    }


    for (let i = 0; i < spotifyAutoMetadata.length; i++) {

        let coincidence = false;

        if (spotifyAutoMetadata[i].priority !== -1) {

            for (let j = 0; j < spotifyAutoMetadata[i].tracks.length && !coincidence; j++) {

                if (titleIsPresent(prepareString4Comparison(spotifyAutoMetadata[i].tracks[j].songName), song)) {
                    coincidence = true;
                }

            }

            if (!coincidence) {
                spotifyAutoMetadata[i].priority = -1;
            }

        }

    }

    let spotifyMetadata = {}

    for (let i = 0; i < spotifyAutoMetadata.length; i++) {

        if (spotifyAutoMetadata[i].priority === 1) {
            spotifyMetadata = spotifyAutoMetadata[i];
            break;
        }

    }


    if (Object.keys(spotifyMetadata).length === 0) {

        for (let i = 0; i < spotifyAutoMetadata.length; i++) {

            if (spotifyAutoMetadata[i].priority === 2) {
                spotifyMetadata = spotifyAutoMetadata[i];
                break;
            }

        }

    }

    return spotifyMetadata;

}


async function getYoutubeHTMLInfo(youtubeURL) {

    let youtubeInfo = {};

    let response = await websiteFetchHandler(youtubeURL);

	const data = await response.text();

    let startIndex = data.indexOf("datePublished");

    youtubeInfo.datePublished = data.substring(startIndex + 24, startIndex + 34);

    startIndex = data.indexOf("videoId") + 32;
    let endIndex = data.indexOf("lengthSeconds") - 3;

    youtubeInfo.title = data.substring(startIndex, endIndex);

    return youtubeInfo;

}



async function tagFile(spotifyMetadata, songTitle) {

    /////////////

    function appendArtists(inputArtists, artistType) {

        let outputArtists = null;                                                                                            //String

		let inputArtistsAux = inputArtists.split(", ");


        for (let i = 0; i < inputArtistsAux.length; i++) {                                                                   //Album artist(s)

            if (i == 0) {
                outputArtists = inputArtistsAux[0];
            }

            else if (i > 0 && artistType == 0) {                                                                             //artistType = 0 is the artist field

                if (i == 1) {
                    outputArtists = outputArtists + " ft. " + inputArtistsAux[i];                                            //2nd artist of a single
                }

                else {
                    outputArtists = outputArtists + ", " + inputArtistsAux[i];
                }

            }

            else if (i > 0 && artistType == 1) {                                                                             //artistType = 1 is the album artist field
                outputArtists = outputArtists + ", " + inputArtistsAux[i];
            }

        }

        return outputArtists.toLowerCase().replace(/(^\w{1})|(\s+\w{1})/g, letter => letter.toUpperCase()).replace("Ft.", "ft.");

    }

    function indexOfSongs2Download() {

        for (let i = 0; i < songs2Download.length; i++) {

            if (songs2Download[i].song.localeCompare(songTitle) == 0) {
                return i;
            }

        }

    }




    /////////////


    let songs2DownloadIndex = indexOfSongs2Download();
    let metadata = {};

    let titleFormated = formatTitleTag(songs2Download[songs2DownloadIndex].song);
    metadata.title = titleFormated;

    let words = formatTitleSpotify(titleFormated).split(" ");

    for (let i = 0; i < words.length; i++) {
        words[i] = prepareString4Comparison(words[i]);
    }

    for (let i = 0; i < spotifyMetadata.tracks.length; i++) {

        let coincidence = true;
        let spotifyTitle = prepareString4Comparison(spotifyMetadata.tracks[i].songName);

        for (let j = 0; j < words.length && coincidence; j++) {

            if (!spotifyTitle.includes(words[j])) {
                coincidence = false;
            }

        }

        if (coincidence) {
            metadata.artist = appendArtists(spotifyMetadata.tracks[i].artists, 0);                                           //Artist(s)
            metadata.artist = metadata.artist.replaceAll("&amp;", "&");
        }

    }


    if (spotifyMetadata.album_type == "single") {
        metadata.album = metadata.title + " " + config.downtag_mode.singles_name;
        metadata.albumArtist = "";
    }

    else {                                                                                                                   //== "album" or "EP"

        metadata.album = spotifyMetadata.album.toLowerCase().replace(/(^\w{1})|(\s+\w{1})/g, letter => letter.toUpperCase()).replace(" (Deluxe)", "").replace(" (Deluxe Edition)", "");      //Album name

        let aux = metadata.album.split(" (")
        if (aux.length === 2) {
            aux[1] = "(" + aux[1].replace(/(^\w{1})|(\s+\w{1})/g, letter => letter.toUpperCase());
        }
        metadata.album = aux.join(" ");

        metadata.albumArtist = appendArtists(spotifyMetadata.album_artist, 1);                                               //Album artist(s)
        metadata.albumArtist = metadata.albumArtist.replaceAll("&amp;", "&");
    }

    metadata.genre = songs2Download[songs2DownloadIndex].genre;                                                              //Genre
    metadata.year = parseInt(spotifyMetadata.release_date.split("-")[0]);


    if (songs2Download[songs2DownloadIndex].youtube_url.localeCompare("") != 0) {

        const videoInfo = await getYoutubeHTMLInfo(songs2Download[songs2DownloadIndex].youtube_url);

        let youtubeYear = parseInt(videoInfo.datePublished.split("-")[0]);
        let spotifyYear = parseInt(spotifyMetadata.release_date.split("-")[0]);

        if (youtubeYear < spotifyYear) {
            metadata.year = youtubeYear;                                                                                     //Release date
        }

        else {
            metadata.year = spotifyYear;                                                                                     //Release date
        }

    }

    metadata.imageURL = spotifyMetadata.imageURL;
    const options = {
        url: metadata.imageURL,
        dest: config.downtag_mode.output_image_directory + "/image.jpg",
    };


    const imageFileName = await imageDownloader.image(options).then(({ filename }) => {
        //console.log("Saved to", filename);
    });

    const filepath = config.downtag_mode.output_music_directory + "/" + songs2Download[songs2DownloadIndex].song + ".mp3";

    const tags = {
        title: metadata.title,
        artist: metadata.artist,
        album: metadata.album,
        performerInfo: metadata.albumArtist,
        genre: metadata.genre,
        year: metadata.year,
        APIC: config.downtag_mode.output_image_directory + "/image.jpg"
    }


    const taggingResult = NodeID3.write(tags, filepath);
    await delay(3000);                                                                                                       //The NodeID3.write method is not synchronous, this gives raise to the delay method of 3 seconds
    fs.unlinkSync(config.downtag_mode.output_image_directory + "/image.jpg");


    if (taggingResult && taggingResult.errno === undefined) {
        console.log("# " + songs2Download[songs2DownloadIndex].song + ".mp3 successfully tagged\n");
    }

    else {
        console.log("$ " + songs2Download[songs2DownloadIndex].song + ".mp3 couldn't be tagged\n");
    }

}


async function checkAccessToken() {

    async function getToken() {
        const response = await fetch('https://accounts.spotify.com/api/token', {
            method: 'POST',
            body: new URLSearchParams({
                'grant_type': 'client_credentials',
            }),
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': 'Basic ' + (Buffer.from(config.downtag_mode.client_id + ':' + config.downtag_mode.client_secret).toString('base64')),
            },
            });

        let token = await response.json();

        return String(token.access_token);

    }

    if (config.downtag_mode.client_id.localeCompare("") !== 0 && config.downtag_mode.client_secret.localeCompare("") !== 0) {

        if (config.downtag_mode.access_token.localeCompare("") === 0) {
            config.downtag_mode.access_token = await getToken();
            spotifyApi.setAccessToken(config.downtag_mode.access_token);
            config.downtag_mode.issued_token_timestamp = new Date();
            fs.writeFileSync(__dirname + "/config.json", JSON.stringify(config, null, 4), 'utf8');
        }

        else {

            let tokenTimeStamp = new Date(config.downtag_mode.issued_token_timestamp);
            let currentDate = new Date();

            if (((currentDate.getTime() - tokenTimeStamp.getTime()) / 1000) < 3300) {                                        //Less than 55 min
                spotifyApi.setAccessToken(config.downtag_mode.access_token);
            }

            else {
                config.downtag_mode.access_token = await getToken();
                spotifyApi.setAccessToken(config.downtag_mode.access_token);
                config.downtag_mode.issued_token_timestamp = new Date();
                fs.writeFileSync(__dirname + "/config.json", JSON.stringify(config, null, 4), 'utf8');
            }

        }

    }

    else {
        console.log("$ To run the auto tag mode you must fill in the client_id and client_secret fields in config.json file\n");
    }


}


async function searchTracksHandler(spotifyApi, song, extraInformation) {            //NETWORK ISSUES. TEMPORARY SOLUTION

    try {

        return await spotifyApi.searchTracks(song + " " + extraInformation);                                                 //Search for tracks whose name, album or artist contains song + extraInformation

    } catch (exception) {

        await delay(config.downtag_mode.delay_seconds_spotify_searches + "000");

        try {

            return await spotifyApi.searchTracks(song + " " + extraInformation);

        } catch (exception) {

            await delay(config.downtag_mode.delay_seconds_spotify_searches + "000");

            try {

                return await spotifyApi.searchTracks(song + " " + extraInformation);

            } catch (exception) {

                await delay(config.downtag_mode.delay_seconds_spotify_searches + "000");

                try {

                    return await spotifyApi.searchTracks(song + " " + extraInformation);

                } catch (exception) {

                    await delay(config.downtag_mode.delay_seconds_spotify_searches + "000");

                    try {

                        return await spotifyApi.searchTracks(song + " " + extraInformation);

                    } catch (exception) {

                        await delay(config.downtag_mode.delay_seconds_spotify_searches + "000");

                        try {

                            return await spotifyApi.searchTracks(song + " " + extraInformation);

                        } catch (exception) {
                            console.log("$ TIMEOUT error\n");
                            process.exit();
                        }

                    }

                }

            }

        }

    }

}


async function websiteFetchHandler(URL) {                                           //NETWORK ISSUES. TEMPORARY SOLUTION

    try {

        return await node_fetch(URL);

    } catch (exception) {

        await delay(config.downtag_mode.delay_seconds_spotify_searches + "000");

        try {

            return await node_fetch(URL);

        } catch (exception) {

            await delay(config.downtag_mode.delay_seconds_spotify_searches + "000");

            try {

                return await node_fetch(URL);

            } catch (exception) {

                await delay(config.downtag_mode.delay_seconds_spotify_searches + "000");

                try {

                    return await node_fetch(URL);

                } catch (exception) {

                    await delay(config.downtag_mode.delay_seconds_spotify_searches + "000");

                    try {

                        return await node_fetch(URL);

                    } catch (exception) {

                        await delay(config.downtag_mode.delay_seconds_spotify_searches + "000");

                        try {

                            return await node_fetch(URL);

                        } catch (exception) {
                            console.log("$ TIMEOUT error\n");
                            process.exit();
                        }

                    }

                }

            }

        }

    }

}


async function searchSpotifyArtistsHandler(spotify_url) {                           //NETWORK ISSUES. TEMPORARY SOLUTION

    try {

        return await getData(spotify_url);

    } catch (exception) {

        await delay(config.downtag_mode.delay_seconds_spotify_searches + "000");

        try {

            return await getData(spotify_url);

        } catch (exception) {

            await delay(config.downtag_mode.delay_seconds_spotify_searches + "000");

            try {

                return await getData(spotify_url);

            } catch (exception) {

                await delay(config.downtag_mode.delay_seconds_spotify_searches + "000");

                try {

                    return await getData(spotify_url);

                } catch (exception) {

                    await delay(config.downtag_mode.delay_seconds_spotify_searches + "000");

                    try {

                        return await getData(spotify_url);

                    } catch (exception) {

                        await delay(config.downtag_mode.delay_seconds_spotify_searches + "000");

                        try {

                            return await getData(spotify_url);

                        } catch (exception) {
                            console.log("$ TIMEOUT error\n");
                            process.exit();
                        }

                    }

                }

            }

        }

    }

}

export {
    assignSongs2Download,
    checkAndClearInput,
    getSpotifySearchLinks,
    getSpotifyHTMLInfo,
    processSpotifyAutoResults,
    getYoutubeHTMLInfo,
    tagFile,
    formatTitleSpotify,
    formatTitleTag,
    checkAccessToken
};

