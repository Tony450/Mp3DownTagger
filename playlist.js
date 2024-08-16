import fs from "fs";
import NodeID3 from "node-id3";
import {M3uPlaylist, M3uMedia} from "m3u-parser-generator";
import getMP3Duration from "get-mp3-duration";
import path from 'path';
import {fileURLToPath} from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const config = JSON.parse(fs.readFileSync(__dirname + "/config.json"));				                                        //__dirname is the parent directory of the current file "./"

var Playlist = class {

    constructor({ playlist2Create, playlistProgressVar, matrixPath, sortingCriteria, sortingDirection, globalOrders, globalTree, finalArrayRecursive, elements2Order }) {
        this.playlist2Create = playlist2Create;
        this.playlistProgressVar = playlistProgressVar;
        this.matrixPath = matrixPath;
        this.sortingCriteria = sortingCriteria;
        this.sortingDirection = sortingDirection;
        this.globalOrders = globalOrders;
        this.globalTree = globalTree;
        this.finalArrayRecursive = finalArrayRecursive;
        this.elements2Order = elements2Order;
    }


    checkAndClearInput() {

        function includeHeaders(x) {
            return (x.playlist_name.localeCompare("playlist_name") != 0 || x.artist.localeCompare("artist") != 0 || x.album.localeCompare("album") != 0 || x.album_artist.localeCompare("album_artist") != 0 || x.genre.localeCompare("genre") != 0 || x.year.localeCompare("year") != 0 || x.date_modified.localeCompare("date_modified") != 0 || x.duration.localeCompare("duration") != 0 || x.order.localeCompare("order") != 0)
        }

        try {

            this.playlist2Create = this.playlist2Create.filter((x) => Object.entries(x).length !== 0);                      //Filter empty lines

            if (this.playlist2Create[0].playlist_name === undefined || this.playlist2Create[0].artist === undefined || this.playlist2Create[0].album === undefined || this.playlist2Create[0].album_artist === undefined || this.playlist2Create[0].genre === undefined || this.playlist2Create[0].year === undefined || this.playlist2Create[0].date_modified === undefined || this.playlist2Create[0].duration === undefined || this.playlist2Create[0].order === undefined) {                                              //Filter if these fields are not included in csv file
                return false;
            }

            this.playlist2Create = this.playlist2Create.filter(includeHeaders);                                             //Filter the lines equals to line 0 in csv
            this.playlist2Create = this.playlist2Create.filter((x) => x.playlist_name.substring(0, 2).localeCompare(config.comment_character) != 0);

            this.playlist2Create = this.playlist2Create.filter((x) => !(x.playlist_name.localeCompare("") == 0 && x.artist.localeCompare("") == 0 && x.album.localeCompare("") == 0  && x.album_artist.localeCompare("") == 0 && x.genre.localeCompare("") == 0 && x.year.localeCompare("") == 0 && x.date_modified.localeCompare("") == 0 && x.duration.localeCompare("") == 0 && x.order.localeCompare("") == 0));


            for (let i = 0; i < this.playlist2Create.length; i++) {
                this.playlist2Create[i].playlist_name = this.playlist2Create[i].playlist_name.replace(/\s+/g, " ").trim();
                this.playlist2Create[i].artist = this.playlist2Create[i].artist.replace(/\s+/g, " ").trim();
                this.playlist2Create[i].album = this.playlist2Create[i].album.replace(/\s+/g, " ").trim();
                this.playlist2Create[i].album_artist = this.playlist2Create[i].album_artist.replace(/\s+/g, " ").trim();
                this.playlist2Create[i].genre = this.playlist2Create[i].genre.replace(/\s+/g, " ").trim();
                this.playlist2Create[i].year = this.playlist2Create[i].year.replace(/\s+/g, " ").trim();
                this.playlist2Create[i].date_modified = this.playlist2Create[i].date_modified.replace(/\s+/g, " ").trim();
                this.playlist2Create[i].duration = this.playlist2Create[i].duration.replace(/\s+/g, " ").trim();
                this.playlist2Create[i].order = this.playlist2Create[i].order.replace(/\s+/g, " ").trim();
            }

            for (let i = 0; i < this.playlist2Create.length; i++) {

                if (this.playlist2Create[i].playlist_name.includes("<") || this.playlist2Create[i].playlist_name.includes(">") || this.playlist2Create[i].playlist_name.includes(":") || this.playlist2Create[i].playlist_name.includes("\"") || this.playlist2Create[i].playlist_name.includes("/") || this.playlist2Create[i].playlist_name.includes("\\") || this.playlist2Create[i].playlist_name.includes("|") || this.playlist2Create[i].playlist_name.includes("?") || this.playlist2Create[i].playlist_name.includes("*")) {
                    return false;
                }

            }

            return true;


        } catch (exception) {
            return false;
        }


    }

    createPlayListName() {                                                                                                  //When the user doesn't provide a list name don't substitute

        let counter = 1;
        let playlistName = config.playlist_mode.auto_generated_playlistname + " ";

        if (!fs.existsSync(config.playlist_mode.output_playlist_directory)){
            fs.mkdirSync(config.playlist_mode.output_playlist_directory);
        }

        fs.opendirSync(config.playlist_mode.output_playlist_directory);

        do {

            switch (counter.toString().length) {

                case 1:                                                                                                     //1 digit
                    playlistName = "Playlist 00" + counter + ".m3u";
                    break;

                case 2:                                                                                                     //2 digits
                    playlistName = "Playlist 0" + counter + ".m3u";
                    break;

                case 3:                                                                                                     //3 digits
                    playlistName = "Playlist " + counter + ".m3u";
                    break;

                default:

            }

            counter++;


        } while (fs.existsSync(config.playlist_mode.output_playlist_directory + "/" + playlistName));

        return playlistName;
    }


    includeSong(path, i) {

        function includeAtribute(desiredAtribute, atribute, type) {

            let words = desiredAtribute.split(",");

            if (desiredAtribute.localeCompare("") == 0) {
                return true;
            }

            else {

                for (let j = 0; j < words.length; j++) {

                    if (atribute !== undefined) {

                        let include = false;

                        if (type === 0) {
                            include = atribute.includes(words[j]);
                        }

                        if (type === 1) {
                            include = atribute.localeCompare(words[j]) == 0;
                        }

                        if (include) {
                            return true;
                        }

                    }

                }

            }

            return false;

        }

        function includeDateAndDuration(desiredYear, year) {                                                                //It will be called by each song

            let years = desiredYear.split(",");

            for (let j = 0; j < years.length; j++) {
                let intervals = years[j].split("-");

                if (intervals.length !== 1) {

                    let start = parseInt(intervals[0]);                                                                     //It should always have a size of 2
                    let end = parseInt(intervals[1]);

                    for (let dateSearching = start; dateSearching <= end; dateSearching++) {

                        //2014,2017-2021
                        if (includeAtribute(dateSearching.toString(), year, 1)) {
                            return true;
                        }

                    }

                }

                else {

                    if (includeAtribute(intervals[0], year, 1)) {
                        return true;
                    }
                }
            }

            return false;


        }


        function calculateYear(interval) {

            if (interval.length === 2) {
                return parseInt(interval[1]);
            }

            else {
                return parseInt(interval[0]);
            }

        }

        function calculateMonth(interval, type) {                                                                           //type = 0 => start; type = 1 => end

            if (interval.length === 2) {
                return parseInt(interval[0]);
            }

            else {

                if (type === 0) {
                    return parseInt(1);
                }

                else if (type === 1) {
                    return parseInt(12);
                }

            }

        }

        function calculateMonthFile(month) {

            const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",];

            return months.indexOf(month) + 1;

        }

        function includeDateModified(desiredDate, date) {

            let years = desiredDate.split(",");

            for (let j = 0; j < years.length; j++) {
                let intervals = years[j].split("-");

                if (intervals.length !== 1) {

                    let startDate = intervals[0];                                                                           //It should always have a size of 2
                    let endDate = intervals[1];

                    let startInterval = startDate.split("/");
                    let endInterval = endDate.split("/");

                    if (startInterval.length !== 1 || endInterval.length !== 1) {

                        let startYear = calculateYear(startInterval);
                        let endYear = calculateYear(endInterval);;

                        let startMonth = calculateMonth(startInterval, 0);                                                  //It should always have a size of 2
                        let endMonth = calculateMonth(endInterval, 1);

                        let monthSearching = startMonth;

                        for (let yearSearching = startYear; yearSearching <= endYear; yearSearching++) {

                            while ((monthSearching <= 12 && yearSearching !== endYear) || (monthSearching <= endMonth && yearSearching === endYear)) {

                                //2014,2017-2021
                                //2014,03/2017-08/2021
                                if (includeAtribute(monthSearching + "/" + yearSearching, date, 1)) {
                                    return true;
                                }

                                monthSearching = (monthSearching + 1) % 13;

                                if (monthSearching == 0) {
                                    monthSearching = 1;
                                    break;
                                }

                            }

                        }

                    }

                    else {

                        startDate = parseInt(startDate);
                        endDate = parseInt(endDate);

                        for (let dateSearching = startDate; dateSearching <= endDate; dateSearching++) {

                            //2014,2017-2021
                            if (includeAtribute(dateSearching.toString(), date.split("/")[1], 1)) {
                                return true;
                            }

                        }

                    }


                }

                else {

                    //04/2014
                    if (includeAtribute(intervals[0], date.split("/")[1], 1)) {
                        return true;
                    }
                }
            }

            return false;

        }


        let tags = null;

        try {
            tags = NodeID3.read(path);
        }

        catch (exception) {
            console.log("$ Error opening file");
            return false;
        }


        if (includeAtribute(this.playlist2Create[i].artist, tags.artist, 0) && includeAtribute(this.playlist2Create[i].album, tags.album, 0) &&
        includeAtribute(this.playlist2Create[i].album_artist, tags.performerInfo, 0) && includeAtribute(this.playlist2Create[i].genre, tags.genre, 0) &&
        includeDateAndDuration(this.playlist2Create[i].year, tags.year)) {

            const stats = fs.statSync(path);

            //[3;2-5;8]         3 min, between x e y

            let dateModified = calculateMonthFile(stats.mtime.toString().split(" ")[1]) + "/" + stats.mtime.toString().split(" ")[3];
            let duration = null;

            try {
                duration = Math.floor(getMP3Duration(fs.readFileSync(path))/60000).toString();
            }

            catch (exception) {
                console.log("$ Error getting Mp3 duration");
                return false;
            }

            if (includeDateModified(this.playlist2Create[i].date_modified, dateModified) && includeDateAndDuration(this.playlist2Create[i].duration, duration)) {

                const fileAttributes = {dateModified:stats.mtime, duration:duration};

                this.matrixPath[i].push({});
                this.matrixPath[i][this.matrixPath[i].length - 1].path = path;
                this.matrixPath[i][this.matrixPath[i].length - 1].tags = tags;
                this.matrixPath[i][this.matrixPath[i].length - 1].fileAttributes = fileAttributes;

            }

        }

    }

    removeSigns(string) {
        return string.replaceAll("+", "").replaceAll("-", "");
    }

    selectValues2Compare(sortingCriteria, array1, array2, groupValue) {

        if (groupValue === null) {

            let array = new Array(2);

            switch (this.removeSigns(sortingCriteria)) {

                case "artist":
                    array = [array1[0].tags.artist, array2[0].tags.artist];
                    break;

                case "album":
                    array = [array1[0].tags.album, array2[0].tags.album];
                    break;

                case "albumArtist":
                    array = [array1[0].tags.performerInfo, array2[0].tags.performerInfo];
                    break;

                case "genre":
                    array = [array1[0].tags.genre, array2[0].tags.genre];
                    break;

                case "year":
                    array = [array1[0].tags.year, array2[0].tags.year];
                    break;

                case "date_modified":
                    array = [array1[0].fileAttributes.dateModified, array2[0].fileAttributes.dateModified];
                    break;

                case "duration":
                    array = [array1[0].fileAttributes.duration, array2[0].fileAttributes.duration];
                    break;

                default:

            }

            return array;

        }

        else {

            let value = null;

            switch (this.removeSigns(sortingCriteria)) {

                case "artist":
                    value = groupValue.tags.artist;
                    break;

                case "album":
                    value = groupValue.tags.album;
                    break;

                case "albumArtist":
                    value = groupValue.tags.performerInfo;
                    break;

                case "genre":
                    value = groupValue.tags.genre;
                    break;

                case "year":
                    value = groupValue.tags.year;
                    break;

                case "date_modified":
                    value = groupValue.fileAttributes.dateModified;
                    break;

                case "duration":
                    value = groupValue.fileAttributes.duration;
                    break;

                default:

            }

            return value;

        }

    }

    compareValues(values, sortingCriteria, sortingDirection) {

        let expression = false;

        if (this.removeSigns(sortingCriteria).localeCompare("date_modified") !== 0) {

            if (sortingDirection === 0) {                                                                                   //Verify the sorting direction
                if (values[0] === undefined) {
                    return false;
                }
                expression = values[0].localeCompare(values[1]) < 0;                                                        //If left goes before right
            }

            else {
                if (values[0] === undefined) {
                    return true;
                }
                expression = values[0].localeCompare(values[1]) > 0;
            }

        }

        else {

            if (sortingDirection === 0) {
                if (values[0] === undefined) {
                    return false;
                }
                expression = values[0] < values[1];
            }

            else {
                if (values[0] === undefined) {
                    return true;
                }
                expression = values[0] > values[1];
            }

        }

        return expression;

    }


    merge(left, right) {

        let sortedArray = [];

        while (left.length && right.length) {                                                                               //Insert the smallest element to the sortedArray

            let values = this.selectValues2Compare(this.sortingCriteria, left, right, null);
            const expression = this.compareValues(values, this.sortingCriteria, this.sortingDirection);

            if (expression) {
                sortedArray.push(left.shift());
            }

            else {
                sortedArray.push(right.shift());
            }

        }

        return [...sortedArray, ...left, ...right];                                                                         //Spread operator combining the three arrays

    }

    mergeSort(array) {

        const half = array.length / 2;


        if (array.length <= 1) {                                                                                            //The base case is array length <=1
            return array;
        }

        const left = array.splice(0, half);                                                                                 //The first half of the array
        const right = array;

        return this.merge(this.mergeSort(left), this.mergeSort(right));

    }


    divideGroups(array, criteria) {

        let indexGroups = [];                                                                                               //Index from which there will be subgroups
        let value = "";

        let previousValue = "";
        let currentValue = "";

        let finalArray = [];

        for (let i = 0; i < array.length; i++) {

            value = this.selectValues2Compare(criteria, null, null, array[i]);

            if (i === 0) {
                previousValue = value;
                currentValue = value;                                                                                       //This line is necessary for the i = 1 iteration to get the previous value
            }

            else {
                previousValue = currentValue;
                currentValue = value;

                if (previousValue === undefined || previousValue.localeCompare(currentValue) !== 0) {                       //If it is different
                    indexGroups.push(i);
                }

            }

        }

        if (indexGroups.length === 0) {                                                                                     //This is a little dangerous
            return [array];                                                                                                 //Size 1
        }

        for (let i = 0; i < indexGroups.length; i++) {
            finalArray[i] = [];

            if (i === 0) {
                finalArray[i] = array.slice(0, indexGroups[i]);

                if (i === (indexGroups.length - 1)) {
                    finalArray[i + 1] = [];
                    finalArray[i + 1] = array.slice(indexGroups[i], array.length);
                }
            }

            else {
                finalArray[i] = array.slice(indexGroups[i - 1], indexGroups[i]);

                if (i === (indexGroups.length - 1)) {
                    finalArray[i + 1] = [];
                    finalArray[i + 1] = array.slice(indexGroups[i], array.length);
                }
            }

        }

        return finalArray;

    }



    shuffle(array) {

        let currentIndex = array.length, randomIndex;

        while (currentIndex != 0) {                                                                                         //While there are remaining elements to shuffle.

            randomIndex = Math.floor(Math.random() * currentIndex);                                                         //Pick a remaining element.
            currentIndex--;

            [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];                          //Swap it with the current element.

        }

        return array;
    }


    calculateSortingDirection(order) {                                                                                      //The user is allowed to put genre and not genre+

        let type = null;
        let index = order.indexOf("-");

        if (index === -1) {
            type = 0;
        }

        else {
            type = 1;
        }

        return type;

    }


    //Tree
    linkDataAndChildren(tree, arrayGroups) {

        tree.data = arrayGroups;
        let familyRegister = [];

        if (tree.id !== 0) {
            familyRegister = [...tree.familyRegister]
            familyRegister.push(tree.id);                                                                                   //Add parent id
        }


        if (arrayGroups.length > 1) {
            for (let i = 0; i < arrayGroups.length; i++) {

                let id = null;

                if (tree.id === 0) {
                    id = (i + 1);
                }

                else {
                    id = parseInt(tree.id.toString() + (i + 1).toString());
                }

                tree.children.push({id:id, parent:tree, familyRegister:familyRegister, children:[]})
            }
        }

    }

    //Tree
    getNode(ID, tree) {

        //345       => [3, 34, 345]             //This is what I need

        function calculateIndexFromID(ID, parentID) {
            return parseInt(ID.toString().replace(parentID.toString(), ""));
        }

        let node = JSON.parse(JSON.stringify(this.globalTree));

        if (ID === 0) {
            return node;
        }

        let searchIDs = tree.familyRegister;

        for (let i = 0; i < searchIDs.length; i++) {

            if (i === 0) {
                node = node.children[searchIDs[i] - 1];
            }

            else {
                node = node.children[calculateIndexFromID(searchIDs[i] - 1, node.id)];
            }
        }


       return node;

    }

    //Tree
    numberOfChildrenOfLeftSibling(tree) {

        let parent = tree.parent;                                                                                           //I need the parent and I am only able to search for it from the root

        let i;

            for (i = 0; i < parent.children.length; i++) {

                if (parent.children[i].id === (tree.id - 1)) {                                                              //Side sibling
                    return parent.children[i].children.length;
                }

            }


        return -1;
    }

    //Tree
    isFirstChild(tree) {

        let parent = tree.parent;

        if (parent.children[0].id === tree.id) {
            return true;
        }

        else {
            return false;
        }

    }

    //Tree
    ordersRestauration(tree, orders) {

        if (tree !== undefined) {

            if (tree.id !== 0 && !this.isFirstChild(tree)) {                                                                //Previous: treeIDLastFigure !== 0

                if (this.numberOfChildrenOfLeftSibling(tree) > 1) {

                    if (orders.length === 0 && this.globalOrders.length <= 2) {
                        this.sortingCriteria = this.globalOrders.at(-1);
                    }

                    else if (orders.length === 0 && this.globalOrders.length > 2) {
                        orders = [this.globalOrders.at(-1)];
                        this.sortingCriteria = this.globalOrders.at(-2);
                    }

                    else {
                        let nextIndex = this.globalOrders.indexOf(orders[0]);
                        orders.unshift(this.globalOrders[nextIndex - 1]);
                        this.sortingCriteria = this.globalOrders[nextIndex - 2];
                        console.log("Restauration orders unkown probability");
                    }

                }

            }

        }

        return orders;

    }


    areEquals(array1, array2) {

        if (array1 === array2) {
            return true
        }

        if (array1 == null || array2 == null) {
            return false
        }

        if (array1.length !== array2.length) {
            return false
        }

        for (var i = 0; i < array1.length; ++i) {
            if (array1[i] !== array2[i]) {
                return false
            }
        }

        return true;

    }

    recursiveAlgorithm(array, orders) {                                                                                     //This size would be reduced little by little

        let tree = this.globalTree;
        tree.id = 0;
        tree.parent = {};
        tree.familyRegister = [];
        tree.children = [];

        this.recursiveAlgorithmRec(array, orders, tree);

    }

    //Tree
    recursiveAlgorithmRec(array, orders, tree) {

        if (array.length === 1 || this.sortingCriteria === undefined) {
            this.linkDataAndChildren(tree, array);
            this.finalArrayRecursive = this.finalArrayRecursive.concat(array);
            this.printPlaylistSortingProgress();
        }

        else {

            let arrayGroups = [];
            let firstSorting = false;
            let divideEquals = false;

            if (orders.length === this.globalOrders.length) {                                                               //First sorting
                arrayGroups[0] = array;
                firstSorting = true;
            }

            else {

                arrayGroups = this.divideGroups(array, this.removeSigns(this.sortingCriteria));                             //When you call the recursive method it is supposed to have 2 sortings as minimum. This implies that sortingCriteria already has a value
                this.linkDataAndChildren(tree, arrayGroups);

                if (arrayGroups.length === 1 && this.areEquals(arrayGroups[0], array)) {
                    divideEquals = true;
                }

            }

            this.sortingCriteria = orders.shift();

            for (let i = 0; i < arrayGroups.length; i++) {

                orders = this.ordersRestauration(tree.children[i], orders);
                let sortedArray = [];

                if (this.sortingCriteria !== undefined) {
                    this.sortingDirection = this.calculateSortingDirection(this.sortingCriteria);
                    sortedArray = this.mergeSort(arrayGroups[i]);
                    this.sortingDirection = 0;                                                                              //Reestablish
                }

                else {
                    sortedArray = arrayGroups[i];
                    this.sortingDirection = 0;
                }

                if (firstSorting || divideEquals) {
                    this.recursiveAlgorithmRec(sortedArray, orders, tree);
                }

                else {
                    this.recursiveAlgorithmRec(sortedArray, orders, tree.children[i]);
                }

            }

        }

    }

    order(i) {

        let orders = this.playlist2Create[i].order.split(",");
        this.globalOrders = [...orders];

        if (orders[0].localeCompare("shuffle") === 0) {                                                                     //It has to be only 1
            return this.shuffle(this.matrixPath[i]);
        }

        //By default, it is alphabetically, avoid this case

        else if (orders[0].localeCompare("") !== 0) {
            this.recursiveAlgorithm(this.matrixPath[i], orders);                                                            //It will be placed in finalArrayRecursive
            return this.finalArrayRecursive;
        }

        else {
            return this.matrixPath[i];
        }

    }

    convertToPositive(number) {

        if (Math.sign(number) !== 1) {
            return 0;
        }

        else {
            return number;
        }
    }


    printPlaylistCreationProgress(i, numberFiles) {

        let playlistProgress = Math.round((((i + 1) * 100)/numberFiles) * 100) / 100;
        let aux = this.convertToPositive(Math.floor(playlistProgress/2) - 1);                                               //This shouldn't be negative

        this.playlistProgressVar.fill("=", 0, aux);
        this.playlistProgressVar[aux] = ">";

        process.stdout.write("\r\x1b[K");
        process.stdout.write("\t[" + this.playlistProgressVar.join("") + "] " + playlistProgress.toFixed(2) + "%");

        if (playlistProgress == 100) {
            this.playlistProgressVar.fill(" ");
            process.stdout.write("\n");
        }

    }

    printPlaylistSortingProgress() {

        let playlistProgress = Math.round(((this.finalArrayRecursive.length * 100)/this.elements2Order) * 100) / 100;
        let aux = this.convertToPositive(Math.floor(playlistProgress/2) - 1);

        this.playlistProgressVar.fill("=", 0, aux);
        this.playlistProgressVar[aux] = ">";

        process.stdout.write("\r\x1b[K");
        process.stdout.write("\t[" + this.playlistProgressVar.join("") + "] " + playlistProgress.toFixed(2) + "%");


        if (playlistProgress == 100) {
            this.playlistProgressVar.fill(" ");
            process.stdout.write("\n");
        }

    }


    createPlaylist(sortedArray, playlistName) {

        const phoneAdaptation = config.playlist_mode.phone_adaptation_settings.phone_playlist;

        const playlist = new M3uPlaylist();
        const mobilePlaylist = new M3uPlaylist();
        playlist.title = playlistName.split(".m3u")[0];
        mobilePlaylist.title = playlist.title;

        if (!phoneAdaptation) {

            for (let i = 0; i < sortedArray.length; i++) {
                let media = new M3uMedia("file:///" + sortedArray[i].path);
                playlist.medias.push(media);
            }

            fs.writeFileSync(config.playlist_mode.output_playlist_directory + "/" + playlistName, playlist.getM3uString());

        }

        else {

            for (let i = 0; i < sortedArray.length; i++) {
                let media = new M3uMedia("file:///" + sortedArray[i].path);
                playlist.medias.push(media);

                let auxArray = sortedArray[i].path.split("/");                                                              //a/b/c
                let mp3File = auxArray.at(-1);




                let phonePath = config.playlist_mode.phone_adaptation_settings.output_phone_playlist_path;
                if (config.playlist_mode.phone_adaptation_settings.output_phone_playlist_path.localeCompare("") !== 0) {
                    phonePath = phonePath + "/" + mp3File;
                    media = new M3uMedia(phonePath);
                }

                else {
                    phonePath = phonePath + mp3File;
                    media = new M3uMedia(phonePath);
                }

                mobilePlaylist.medias.push(media);

            }

            fs.writeFileSync(config.playlist_mode.output_playlist_directory + "/" + playlistName, playlist.getM3uString());

            if (!fs.existsSync(config.playlist_mode.phone_adaptation_settings.output_phone_playlist_directory)){
                fs.mkdirSync(config.playlist_mode.phone_adaptation_settings.output_phone_playlist_directory);
            }

            fs.writeFileSync(config.playlist_mode.phone_adaptation_settings.output_phone_playlist_directory + "/" +
                playlistName.split(".m3u")[0] + config.playlist_mode.phone_adaptation_settings.phone_playlists_name + ".m3u", mobilePlaylist.getM3uString());

        }


    }

    includeFileExtensions(file) {

        for (let i = 0; i < config.playlist_mode.files_2_be_inside_playlists.length; i++) {

            if (file.split(config.playlist_mode.files_2_be_inside_playlists[i])[1] !== undefined) {
                return true;
            }

        }

        return false;

    }
}


export {
    Playlist
};

