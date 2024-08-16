function prepareString4Comparison(string) {
    return string.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();                                   //Removes every accent and transforms to LowerCase
}

async function delay(milliseconds){
    return new Promise(resolve => {
        setTimeout(resolve, milliseconds);
    });
}

function formatTitleTag(songTitle) {                                                                                //Remove everything to the right side from " ("

    let formatedTitleTag = "";

    let titleWithoutBrackets = songTitle.split(" (");

    if (titleWithoutBrackets.length === 2 && titleWithoutBrackets[1].length === 2) {                                //If file name is "Song (1)" or "Song (2)"
        formatedTitleTag = titleWithoutBrackets[0];
    }

    else {                                                                                                          //If file name is "Song (info)"... we don't want to remove this
        formatedTitleTag = songTitle;
    }


    /*  Song (i).mp3
        Song (info).mp3
    */

    return formatedTitleTag;

}

function formatTitleSpotify(songTitle) {

    let songTitleFormated = songTitle.replace(" version", "").replaceAll("(", "").replaceAll(")", "").replaceAll("[", "").replaceAll("]", "").replaceAll("-", "").replaceAll("&", "");

    songTitleFormated = songTitleFormated.replace(/\s+/g, " ");

    return songTitleFormated;

}

function titleIsPresent(spotifyTitle, songTitle) {

    let words = formatTitleSpotify(formatTitleTag(songTitle)).split(" ");

    for (let i = 0; i < words.length; i++) {
        words[i] = prepareString4Comparison(words[i]);
    }

    let coincidence = true;

    for (let i = 0; i < words.length && coincidence; i++) {

        if (!spotifyTitle.includes(words[i])) {
            coincidence = false;
        }

    }

    return coincidence;

}

function checkAutoTagModePresence(songs2Download) {

    let presence = false;

    for (let i = 0; i < songs2Download.length; i++) {

        if (songs2Download[i].spotify_url.localeCompare("auto") === 0) {
            presence = true;
            break;
        }

    }

    return presence;

}

function isEmptyObject(obj) {
    return JSON.stringify(obj) === '{}'
}

function occurrences(string, subString, allowOverlapping) {

    let counter = 0

    string += "";
    subString += "";

    if (subString.length <= 0) {
        return (string.length + 1);
    }

    let index = 0;
    let step = allowOverlapping ? 1 : subString.length;

    while (counter < 5) {
        index = string.indexOf(subString, index);
        if (index >= 0) {
            counter = counter + 1;
            index = index + step;
        } else break;
    }
    return counter;
}

export {
    prepareString4Comparison,
    delay,
    formatTitleTag,
    formatTitleSpotify,
    titleIsPresent,
    checkAutoTagModePresence,
    isEmptyObject,
    occurrences
};
