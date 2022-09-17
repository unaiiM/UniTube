const lib = "./../lib/";
const Downloader = require(lib + "yt-downloader.js");

const url = "https://www.youtube.com/watch?v=QTXwz57eFQI";
let download = new Downloader(url);
const options = { video : { quality : 720, audio : true }};
async function abc(){
	await download.load();
	//console.log(download.formats);
	await download.download(options);
};
abc();
