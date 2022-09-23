const lib = "./../lib/";
const Downloader = require(lib + "yt-downloader.js");

const url = "https://www.youtube.com/watch?v=jUoHX7i03nY";
const download = new Downloader(url);
const options = { video : { quality : 1080 }, audio : { quality : "medium" }};

download.load();

download.on("load", () => {

	download.download(options);

});

download.on("error", (err) => { if(err) throw err; })

download.on("download-finished", () => {

	// somthing	

});
