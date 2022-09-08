const lib = "./../lib/";
const Downloader = require(lib + "yt-video-downloader.js");

const url = "https://www.youtube.com/watch?v=QTXwz57eFQI";
let download = new Downloader(url);
download.load();
