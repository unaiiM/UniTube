# UniTube

## Descripcion

UniTube is just a playlist app where you can create lists and add and watch videos from YouTube without any ads. Can download videos, change video quality or just only listen the audio for fastest playback. 

## Download

Lastest release: https://drive.google.com/file/d/1MAenL0Lzrd8wKv6_X19hnhK6mDhONFsL/view?usp=sharing

## Yt-Downloader

To download these vidos there and get the youtube video servers I devolvet a sample library. Is located inside api/lib/yt-downloader.
If you wat to use it you need to have ffmpeg binary located on ffmpeg/win64/ffmpeg and ffmpeg/linux64/ffmpeg or you can change the path inside the library code.

You can:
  - Import all videos from playlist
  - Get video youtube servers info (separated by quality and type; video and audio)
  - Download videos

Get all video youtube servers info

```
const path = __dirname;
const Downloader = require(path + "/yt-downloader.js");
const URL = "https://youtu.be/ed-oXKDmca0";

let download = new Downloader(URL);

download.load();

download.on("error", (err) => {
   
    throw err;    

});

download.on("load", () => {

    console.log(download.adaptiveFormats);

});
```

Import all videos from playlist:

```
const path = __dirname;
const Downloader = require(path + "/yt-downloader.js");
const URL = "https://www.youtube.com/playlist?list=PLMX7pvmHDB56TRE-kezv4CweH6IWjKeV6";

let download = new Downloader(URL);

download.get_playlist_items();

download.on("exported", (items) => {

    items.forEach((item) => console.log("Item url: " + item));

});
```

Download videos:





