# UniTube

## Descripcion

UniTube is just a playlist app where you can create lists and add and watch videos from YouTube without any ads. Can download videos, change video quality or just only listen the audio for fastest playback. 

## Download
Download it from the link because in this github repo is missing required tools.

Lastest release: https://drive.google.com/file/d/1VkWMxa80xjum3PtGvIrpFWo4Awpj3vkp/view?usp=sharing

## Yt-Downloader

To download these vidos there and get the youtube video servers I developed a sample library. Is located inside api/lib/yt-downloader.

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

Download video:

```
const path = __dirname;
const Downloader = require(path + "/yt-downloader.js");
const URL = "https://youtu.be/ed-oXKDmca0";
const options = {
    video : {
        type: 'video/mp4',  // not required in yt videos there is only mp4 or webm, default is mp4
        quality: 720,       // not required the default is 360
        downloadSocketsSize : 10    // not required default is 10, more sockets more download velocity.
    },
    audio : {
        type: 'audio/mp4',  // not required, same as video
        quality: 'medium',   // not required, default is medium, there is three audio qualitys; low, medium and high
        downloadSocketsSize : 5 // not required, default is 5
    }
};

/*

If you only want audio, just don't define video, do it like this:

options = {
    audio : {
        type: 'audio/mp4',  // not required, same as video
        quality: 'medium',   // not required, default is medium, there is three audio qualitys; low, medium and high
        downloadSocketsSize : 5 // not required, default is 5
    }
};

If you ony want video just don't define audi, do it like this:

options = {
    video : {
        type: 'video/mp4',  // not required in yt videos there is only mp4 or webm, default is mp4
        quality: 720,       // not required the default is 360
        downloadSocketsSize : 10    // not required default is 10, more sockets more download velocity.
    }
};

If you want default options on video or audio just define it, but not put nothing inside, do it like this:

options = {
    video : {}
    audio : {}
};

Default options and only download video:

options = {
    video : {}
};

Default options and only download audio:

options = {
    audio : {}
};

*/

let download = new Downloader(URL);

download.load();

download.on("error", (err) => {
   
    throw err;    

});

download.on("load", () => {

    console.log(download.adaptiveFormats);

    download.download(options,  path);

    download.on("download-finished", (file) => { 
    
        console.log(file); // path to the file and the file name

    });

});
```

Another funcionalities are avaliavle when video is loaded, like:
  - Check url if is a youtube.www url
  - Get video title 
  - Get thumbnail in max resolution
  - Get video thumbnail (small) --> there is 4 sizes; 0, 1, 2, 3 --> if size is not specified the default is 3
  
  
### Posdata

This project is developed by me with no professional use, then the code is not perfect, there is a lot of comments and a lot of functions inside only one file.
