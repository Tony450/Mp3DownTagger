var __async = (__this, __arguments, generator) => {
  return new Promise((resolve, reject) => {
    var fulfilled = (value) => {
      try {
        step(generator.next(value));
      } catch (e) {
        reject(e);
      }
    };
    var rejected = (value) => {
      try {
        step(generator.throw(value));
      } catch (e) {
        reject(e);
      }
    };
    var step = (x) => x.done ? resolve(x.value) : Promise.resolve(x.value).then(fulfilled, rejected);
    step((generator = generator.apply(__this, __arguments)).next());
  });
};

// src/downloadSong.ts
import NodeID3 from "node-id3";
import ytdl2 from "@distube/ytdl-core";

// src/convertVideoToAudio.ts
import cp from "child_process";
import fs from "fs";
import ffmpeg from "ffmpeg-static";
function convertVideoToAudio(inputFile, outputFile) {
  if (!fs.existsSync(inputFile)) {
    throw new Error("Input file does not exist: " + inputFile);
  }
  if (!ffmpeg) {
    throw new Error(`Failed to resolve ffmpeg binary`);
  }
  
  cp.execSync(`${ffmpeg} -loglevel 24 -i ${inputFile} -vn -sn -c:a mp3 -ab 192k ${outputFile}`);
  fs.rmSync(inputFile);
}

// src/downloadVideo.ts
import fs2 from "fs";
import ytdl from "@distube/ytdl-core";
function downloadVideo(videoInfo, outputFile) {
  const stream = ytdl.downloadFromInfo(videoInfo, { quality: "highestaudio" }).pipe(fs2.createWriteStream(outputFile));
  return new Promise((resolve, reject) => {
    stream.on("finish", resolve);
    stream.on("error", (err) => {
      reject(err);
    });
  });
}

// src/fetchAlbumArt.ts
import axios from "axios";
function fetchAlbumArt(url) {
  return axios.get(url, { responseType: "arraybuffer" }).then((response) => Buffer.from(response.data, "binary")).catch(() => {
    throw new Error("Failed to fetch album art from endpoint: " + url);
  });
}

// src/fetchSearchResults.ts
import axios2 from "axios";
function fetchSearchResults(searchTerm) {
  return __async(this, null, function* () {
    const url = new URL("https://itunes.apple.com/search?");
    url.searchParams.set("media", "music");
    url.searchParams.set("term", searchTerm);
    const response = yield axios2.get(url.href).catch((error) => {
      var _a;
      if ((_a = error.response) == null ? void 0 : _a.status) {
        throw new Error(`Call to iTunes API returned status code ${error.response.status}`);
      }
      throw new Error("Call to iTunes API failed and did not return a status");
    });
    if (response.data.resultCount === 0) {
      throw new Error("Call to iTunes API did not return any results");
    }
    return response.data.results;
  });
}

// src/utils.ts
import fs3 from "fs";
import os from "os";
import path from "path";
import readline from "readline";
function getDownloadsDir() {
  return path.join(os.homedir(), "Downloads");
}
function removeParenthesizedText(s) {
  return s.replace(/\s*[([].*?[)\]]\s*/g, "");
}
function isDirectory(dirPath) {
  return fs3.existsSync(dirPath) && fs3.lstatSync(dirPath).isDirectory();
}
function userInput(prompt, defaultInput) {
  return __async(this, null, function* () {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    return new Promise((resolve, reject) => {
      rl.question(prompt, (response) => {
        rl.close();
        if (response) {
          resolve(response);
        } else {
          reject(new Error("Invalid response: " + response));
        }
      });
      rl.write(defaultInput || "");
    });
  });
}

// src/verifySearchResult.ts
function verifySearchResult(result) {
  return __async(this, null, function* () {
    console.log("The following tags were extracted from iTunes:");
    console.log("Title: " + result.trackName);
    console.log("Artist: " + result.artistName);
    let verified = null;
    while (verified === null) {
      const userSelection = (yield userInput("Please verify (y/n): ")).toLowerCase();
      if (userSelection === "y" || userSelection == "yes") {
        verified = true;
      } else if (userSelection === "n" || userSelection == "no") {
        verified = false;
      } else {
        console.error("Invalid selection, try again!");
      }
    }
    return verified;
  });
}

// src/extractSongTags.ts
function extractSongTags(videoInfo, verify) {
  return __async(this, null, function* () {
    const searchTerm = removeParenthesizedText(videoInfo.videoDetails.title);
    const results = yield fetchSearchResults(searchTerm);
    let result = results[0];
    if (verify) {
      for (result of results) {
        if (yield verifySearchResult(result)) {
          break;
        }
      }
    }
    const artworkUrl = result.artworkUrl100.replace("100x100bb.jpg", "600x600bb.jpg");
    const albumArt = yield fetchAlbumArt(artworkUrl);
    return {
      title: result.trackName,
      artist: result.artistName,
      image: {
        mime: "image/png",
        type: {
          id: 3,
          name: "front cover"
        },
        description: "Album Art",
        imageBuffer: albumArt
      }
    };
  });
}

// src/getFilepaths.ts
import fs4 from "fs";
import path2 from "path";
function getFilepaths(title, outputDir) {
  const baseFileName = removeParenthesizedText(title).replace(/[^a-z0-9]/gi, "_").split("_").filter((element) => element).join("_").toLowerCase();
  const filepaths = {
    audioFile: path2.join(outputDir, baseFileName + ".mp3"),
    videoFile: path2.join(outputDir, baseFileName + ".mp4")
  };
  Object.values(filepaths).forEach((file) => {
    if (fs4.existsSync(file)) {
      fs4.rmSync(file);
    }
  });
  return filepaths;
}

// src/downloadSong.ts
function downloadSong(url, options) {

  let audioFile = options.outputDir + "/\"" + options.audioFile + "\"" + ".mp3";

  return __async(this, null, function* () {
    var _a;
    if ((options == null ? void 0 : options.outputDir) && !isDirectory(options.outputDir)) {
      throw new Error(`Not a directory: ${options.outputDir}`);
    }
    const videoInfo = yield ytdl2.getInfo(url).catch(() => {
      throw new Error(`Failed to fetch info for video with URL: ${url}`);
    });
    const filepaths = getFilepaths(videoInfo.videoDetails.title, (_a = options == null ? void 0 : options.outputDir) != null ? _a : getDownloadsDir());
    yield downloadVideo(videoInfo, filepaths.videoFile);
    convertVideoToAudio(filepaths.videoFile, audioFile);
    if (options == null ? void 0 : options.getTags) {
      const songTags = yield extractSongTags(videoInfo, options.verifyTags);
      NodeID3.write(songTags, audioFile);
    }
    //console.log(`Done! Output file: ${audioFile}`);
    return audioFile;
  });
}
export {
  downloadSong,
  getDownloadsDir,
  isDirectory,
  removeParenthesizedText,
  userInput
};
//# sourceMappingURL=index.mjs.map