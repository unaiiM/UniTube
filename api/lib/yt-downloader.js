const path = __dirname;
const https = require("https");
const util = require('util');
const fs = require("fs");
const os = require("os");
const cprocess = require("child_process");
const ffmpeg = {
	winPath : path + "/ffmpeg/ffmpeg-master-latest-win64-gpl/bin",
	linuxPath : path + "/ffmpeg/ffmpeg-master-latest-linux64-gpl/bin"
};
const EventEmitter = require("events");

class Downloader {
	
	constructor (url) {

		this.url = this.check_url(url);
	
	};

	async load(){

		this.yt_video_source = await this.get_yt_video_source();	// video source
		this.ytipc = this.get_ytipc(); 					// ytInitialPlayerResponse variable

		this.base_js_url = this.get_base_js_url();			// base.js url
		this.base_js_source = await this.get_base_js_source();		// base.js source
		
		if(this.has_signatureCipher()){
			this.cipher = {};						// cipher object
			this.cipher.mfname = this.get_decode_function_name();		// name of the main decode function
			this.cipher.mfdecode = this.get_main_decode_function();		// statments block of decode function
			this.cipher.ofname = this.get_object_decode_functions_name();   // name of the object of the subfunctions of the decode function
			this.cipher.ofdecode = this.get_object_decode_functions();	// block content of the subfunctions object
		};	

		this.title = this.get_title();
		//this.formats = this.get_formats();				// get video formats
		this.adaptiveFormats = this.get_adaptive_formats();		// get video adaptiveFormats
		this.emit("load");
	};

	check_url(url){

		// Video ID
		// https://www.youtube.com/watch?v=7d0QGcRXqGg --> 7d0QGcRXqGg
		// https://youtu.be/7d0QGcRXqGg --> 7d0QGcRXqGg
		// embeded ???

		if(url.match(".*:\/\/.*\.youtube.com\/") !== null){
			return url;	
		}else if(url.match(".*:\/\/youtu.be\/")){
			let v = url.split("/")[4];
			return "https://www.youtube.com/watch?v=" + v;
		}else {
			let err = new Error("Bad url entred! Example: https://youtube.com/watch?v=jUoHX7i03nY");
			this.emit("error", err);
		};

	};

	get_yt_video_source(){

		let url = this.url;	
			
		let content = new Promise((resolv, reject) => {
			
			let data = "";

			https.get(url, (res) => {
	
				res.on("data", (buff) => data += buff.toString());
				res.on("error", (err) => { 
					if(err){
						this.emit("error", err);
					}; 
				});
				res.on("end", () => resolv(data));

			});

		});

		return content;

	};

	get_ytipc(){

		let content = this.yt_video_source;

		let ytInitialPlayerResponse;
		
		let start = content.indexOf("var ytInitialPlayerResponse =");
		
		if(start === -1){
			let err = new Error("Can't found the ytInitialPlayerResponse variable on the video source!");
			this.emit("error", err);
		};

		start += "var ytInitialPlayerResponse =".length;

		let end = (content.slice(start, content.length)).indexOf("</script>") + start - 1; // - 1 for the final ; not allowed in JSON
	

		ytInitialPlayerResponse = content.slice(start, end);
		ytInitialPlayerResponse = JSON.parse(ytInitialPlayerResponse);
		
		return ytInitialPlayerResponse;
	};

	get_base_js_url(){

		let ytvs = this.yt_video_source;
	
		let start = ytvs.indexOf('"jsUrl":"');
		
		if(start === -1){
			let err = new Error("Can't found the base.js url on the video source!");
			this.emit("error", err);
		};

		start += '"jsUrl:""'.length;

		let end = (ytvs.slice(start, ytvs.length)).indexOf('base.js"') + 'base.js"'.length + start - 1;
		
		let base = ytvs.slice(start, end);
		base = "https://www.youtube.com" + base;
		
		return base;

	}

	get_base_js_source(){

		let url = this.base_js_url;	
			
		let content = new Promise((resolv, reject) => {
			
			let data = "";

			https.get(url, (res) => {
	
				res.on("data", (buff) => data += buff.toString());
				res.on("error", (err) => {
					if(err) this.emit("error", err); 
				});
				res.on("end", () => resolv(data));

			});

		});

		return content;
	
	}

	 	
	/***
		 Chipher 
				***/


	has_signatureCipher(){

		let ytipc = this.ytipc;

		if(ytipc.streamingData.adaptiveFormats[0].signatureCipher) return true;
		else return false;
	
	};	

	get_decode_function_name(){

		let content = this.base_js_source;
		
		let start = content.match(/&&\(.*=.*\(decodeURIComponent\(.*\)\),.*.set\(.*,encodeURIComponent\(.*\)\)\)/);

		if(start === null){
			let err = new Error("Can't find the decode function name on base.js source!");
			this.emit("error", err);	
		};

		start = start.index;
		start += (content.slice(start, content.length)).indexOf("=") + 1; 
		let end = (content.slice(start, content.length)).indexOf("(") + start;
		
		let fname = content.slice(start, end);

		return fname; 

	};


	double_escape_special_chars(str){
	
		let BLACKLIST = "[$&+,:;=?@#|'<>.^*()%!-]";
		
		str = str.split("");

		for(let i = 0; i < str.length; i++){

			if(BLACKLIST.indexOf(str[i]) !== -1){
				str[i] = "\\" + str[i];
			};		

		};

		return str.join("");

	};

	get_main_decode_function(){

		let fname = this.cipher.mfname;
		let content = this.base_js_source;	
			
		let fdecode;

		let start = content.match(this.double_escape_special_chars(fname) + "=function(.*){");
		
		if(start === null){
			let err = new Error("Can't find the decode function block statments!");
			this.emit("error", err);		
		};

		start = start.index + fname.length + 1;
		let end = (content.slice(start, content.length)).indexOf("};") + start + 1;
		
		let fcontent = content.slice(start, end);

		eval("fdecode="+ fcontent);
	
		return fdecode;	
	
	}

	get_object_decode_functions_name(){
		
		let mfdecode = (this.cipher.mfdecode).toString();

		let start = mfdecode.match(/;.*..*(.*);/);
		if(start === null){
			let err = new Error("Can't find the name of the decode functions object on the decode function block!");
			this.emit("error", err);
		};

		start = start.index + 1;

		let end = (mfdecode.slice(start, mfdecode.length)).indexOf(".") + start;

		let ofname = mfdecode.slice(start, end);
		
		return ofname;
	};

	get_object_decode_functions(){

		let ofname = this.cipher.ofname;
		let content = this.base_js_source;
		
		let start = content.indexOf("var " + ofname + "=");
	
		if(start === -1){
			let err = new Error("Can't find the decode functions object variable on the base.js source!");
			this.emit("error", err);
		};	

		start += ("var " + ofname + "=").length;

		let end = (content.slice(start, content.length)).indexOf("};") + "};".length + start;

		let ofdecode = content.slice(start, end);
		eval("ofdecode=" + ofdecode);
		
		return ofdecode;

	};

	decode_cipher(s){

		let mfdecode = this.cipher.mfdecode;
		let ofdecode = this.cipher.ofdecode;
		let ofname = this.cipher.ofname;		

		mfdecode = (mfdecode.toString()).replaceAll(ofname, 'ofdecode');
		eval("mfdecode=" + mfdecode);

		let signature = mfdecode(s);

		return signature;

	};

	/*get_formats(){

		let ytipc = this.ytipc;
		let formats = ytipc.streamingData.formats;
		
		for(let i = 0; i < formats.length; i++){

			let signatureCipher = formats[i].signatureCipher;

			if(signatureCipher !== undefined){
				
				signatureCipher = signatureCipher.split("&");
			
				let query = {}; 
				
				for(let x = 0; x < signatureCipher.length; x++){
	
					signatureCipher[x] = signatureCipher[x].split("=");
	
					let key = signatureCipher[x][0];
					let value = decodeURIComponent(signatureCipher[x][1]);
	
					query[key] = value;
	
				};
					
				let s = this.decode_cipher(query['s']);
				// apply decoded signature to url
				let url = query['url'] + "&" + query["sp"] + "=" + s;
				
				formats[i]["url"] = url;

			}else continue;

		};	
	
		return formats;

	};*/


	get_adaptive_formats(){ // and decode Signature Cipher

		let ytipc = this.ytipc;
		let formats = ytipc.streamingData.adaptiveFormats;
		
		for(let i = 0; i < formats.length; i++){

			let signatureCipher = formats[i].signatureCipher;

			if(signatureCipher){
				
				signatureCipher = signatureCipher.split("&");
			
				let query = {}; 
				
				for(let x = 0; x < signatureCipher.length; x++){
	
					signatureCipher[x] = signatureCipher[x].split("=");
	
					let key = signatureCipher[x][0];
					let value = decodeURIComponent(signatureCipher[x][1]);
	
					query[key] = value;
	
				};
	
				let s = this.decode_cipher(query['s']);
				let url = query['url'] + "&" + query["sp"] + "=" + s;
				
				formats[i]["url"] = url;
				formats[i].contentLength = Number(formats[i].contentLength);
			}else continue;

		};	

		return formats;

	};

	check_quality(quality){

		if(typeof(quality) === "string") quality = quality.toUpperCase();

		switch(quality){
			case 144:
			case 240:
			case 360:
			case 480:
			case 720:
			case 1080:
			case 1440:
			case 2160:
			case 'LOW':
			case 'MEDIUM':
			case 'HIGH':
				return false;
				break;
			default:
				return true;	
		};

	};

	get_format(type, quality, mimeType){
	
		if(!type || !quality){ 
			let err = new Error("Undefined quality or type.");
			this.emit("error", err);
		}else if(type !== 'video' && type !== 'audio'){
			let err = new Error("Bad type defined!");
			this.emit("error", err);
		};

		if(this.check_quality(quality)){
			let err = new Error("Bad quality defined!");
			this.emit("error", err);
		};

		if(type === 'audio') quality = "AUDIO_QUALITY_" + quality.toUpperCase();
		else quality = quality + "p";

		let formats = this.adaptiveFormats;	
		let selectedFormats = [];	
	
		if(mimeType === "any" || !mimeType){
		
			formats.forEach((item) => {

				let itemType = item.mimeType.split("/")[0];
		
				if(itemType === type) selectedFormats.push(item);			
		
			});	
	
		}else {
	
			formats.forEach((item) => {

				let itemMimeType = item.mimeType;		

				if(itemMimeType.indexOf(mimeType) !== -1) selectedFormats.push(item);			

			});		
		};

		if(formats.length === 0){
			let err = new Error("None formts found with" + mimeType + " mimeType");
			this.emit("error", err);
		};			

		let selected;

		if(type === 'video'){

			for(let i = 0; i < selectedFormats.length; i++){

				if(selectedFormats[i].qualityLabel === quality) {
					
					selected = selectedFormats[i];
					break;

				}else continue;
			
			};

		} else { // audio

			for(let i = 0; i < selectedFormats.length; i++){

				if(selectedFormats[i].audioQuality === quality) {
					
					selected = selectedFormats[i];
					break;

				}else continue;
			
			};

		};
	
		return selected;

	};

	get_title(){

		let ytipc = this.ytipc;
		
		return ytipc.videoDetails.title;

	};

	filter_bad_chars(str){

		let BLACKLIST = /[<>:"\/\\|?*]/;
		let index = 0;
		let tmpStr = str;
		let match = tmpStr.match(BLACKLIST);		
		str = str.split("");


		while(match){

			index += match.index;
			str[index] = encodeURIComponent(match[0]);

			tmpStr = tmpStr.slice(index + 1, tmpStr.length);		
			match = tmpStr.match(BLACKLIST);
		
		};

		return str.join("");

	};

	createDownloadRange(format, size){

		let range = [];
		let length = Math.floor(format.contentLength / size);
		let position = 0;
			
		for(let i = 0; i < size; i++){
			range.push(format.url + "&range=" + (position) + "-" + (position + length - 1));
			position += length; 	
			
		};	

		let mod = format.contentLength - position;
		if(mod > 0) range.push(format.url + "&range=" + (position) + "-" + (position + mod));

		return range;

	}

	checkDownloadOptions(options){

		/*
			video : {
				quality : 360,
				type : 'm4a' # webm |
				audio : true	
			}
			audio : {
				quality : low,
				type: 'm4a' # webm | m4a
			}
			downloadRangeSize : 10 
		*/	
		// mp4 videos with higher quality than 360 will need to download the audio separated

		let checkedOptions = {
			video : {
				quality : undefined,
				mimeType : undefined
			},
			audio : {
				quality : undefined,
				mimeType : undefined
			},
			downloadRangeSize : undefined
		};
		let defaultOptions = {
			video : {
				quality : 360,
				mimeType: 'video/mp4'
			},
			audio : {
				quality : "medium",
				mimeType : 'audio/mp4',
			},
			downloadRangeSize : 10
		};

		// default settings
	
		if(!options.video && !options.audio) return defaultOptions;
	
		if(options.video){

			if(!options.video.quality) checkedOptions.video.quality = defaultOptions.video.quality
			else if(this.check_quality(options.video.quality)){
				let err = new Error("Bad Quality");
				this.emit("error", err);
			}else checkedOptions.video.quality = options.video.quality;

			if(!options.video.mimeType) checkedOptions.video.mimeType = defaultOptions.video.mimeType
			else checkedOptions.video.mimeType = options.video.mimeType;
		};
	

		if(options.audio){

			if(!options.audio.quality) checkedOptions.audio.quality = defaultOptions.audio.quality
			else if(this.check_quality(options.audio.quality)){
				let err = new Error("Bad Quality");
				this.emit("error", err);
			}else checkedOptions.audio.quality = options.audio.quality;
	
			if(!options.audio.mimeType) checkedOptions.audio.mimeType = defaultOptions.audio.mimeType
			else checkedOptions.audio.mimeType = options.audio.mimeType;
					

		};

		if(!options.downloadRangeSize) checkedOptions.downloadRangeSize = defaultOptions.downloadRangeSize;
	
		console.log("Generated options:\n-------------", checkedOptions, "-------------");

		this.options = checkedOptions;
	
		return checkedOptions;

	};	

	createDownloadSockets(options){ 
		
		options = this.checkDownloadOptions(options);

		let info = {};

		if(options.video){
			
			let format = this.get_format("video", options.video.quality, options.video.mimeType);	

			let videoRange = this.createDownloadRange(format, options.downloadRangeSize, options.mimeType);

			info["video"] = {
				format : format,
				videoRange : videoRange
			};

			for(let i = 0; i < videoRange.length; i++){

				let index = i; // donwload index

				https.get(videoRange[i], (res) => {
	
					this.emit("video-socket", res, index);		
			
				});
			};
			
		};
	
		if(options.audio){	
			
			let format = this.get_format("audio", options.audio.quality);
	
			let audioRange = this.createDownloadRange(format, options.downloadRangeSize, options.audio.mimeType);
		
			info["audio"] = {
				format : format,
				audioRange : audioRange
			};

			for(let i = 0; i < audioRange.length; i++){

				let index = i; // donwload index

				https.get(audioRange[i], (res) => {
	
					this.emit("audio-socket", res, index);		
			
				});
			};
			
		};

		/*let url = format.url;	
		let bufferSize = Number(format.contentLength);
		let downloadedSize = 0;
			
		let buffers = [];

		https.get(url, (res) => {Number(info.contentLength);
	
			res.on("data", (buff) => {
				
				buffers.push(buff);
				downloadedSize += buff.length;

				let currentPercent = Math.round((downloadedSize * 100) / bufferSize);
				process.stdout.write("\rDownloading [" + currentPercent + "%]");
				
			});
			
			res.on("end", () => resolv(Buffer.concat(buffers)));
		});*/

		return info;

	};

	check_file_type(mimeType){

		let type;

		switch(mimeType){
			case "audio/mp4":
				type = "m4a";
				break;
			case "video/mp4":
				type = "mp4";
				break;
			case "video/webm":
			case "audio/webm":
				type = "webm";
				break;
			default:
				type = "none";
		
		};

		return type;
	};

	download(options, opath = "."){	// opath --> output path for the donwloaded files

		let downloadInfo = this.createDownloadSockets(options);			
	
		let title = this.get_title();

		let videoFile;
		let audioFile;

		let isAudioDownloaded = false;
		let isVideoDownloaded = false;

		let videoDownloadedSize = 0;
		let audioDownloadedSize = 0;
		let audioSize;
		let videoSize;
		
		let videoBuffers = [];
		let videoBuffersFinished = 0;
		let videoBuffersLength;
		
		if(downloadInfo.video){
		
			let mimeType = downloadInfo.video.format.mimeType.match(/.*;/);
			mimeType = mimeType[0].slice(0, mimeType[0].length - 1);
		
			let type = this.check_file_type(mimeType);
			videoFile = opath + "/" + this.filter_bad_chars(title) + "." + type;					
			//

			videoBuffersLength = downloadInfo.video.videoRange.length;
	
			videoSize = downloadInfo.video.format.contentLength;

		};

		let audioBuffers = [];
		let audioBuffersFinished = 0;
		let audioBuffersLength;

		if(downloadInfo.audio){
	
			let mimeType = downloadInfo.audio.format.mimeType.match(/.*;/);
			mimeType = mimeType[0].slice(0, mimeType[0].length - 1);
			
			let type = this.check_file_type(mimeType);
			audioFile = opath + "/" + this.filter_bad_chars(title) + "." + type;		

			//
			
			audioBuffersLength = downloadInfo.audio.audioRange.length;

			audioSize = downloadInfo.audio.format.contentLength;

		};
		
		let DownloadEvents = new EventEmitter();
	
		this.on("video-socket", (socket, index) => { 
			
			socket.on("data", (buff) => {

				videoDownloadedSize += buff.length;

				if(!videoBuffers[index]) videoBuffers[index] = buff;
				else videoBuffers[index] = Buffer.concat([videoBuffers[index], buff]);
			
				if(downloadInfo.audio){
						
					process.stdout.write("\r[Info] Downloading video: " + Math.floor((videoDownloadedSize * 100) / videoSize) + "%\t|\t Downloading audio: " + Math.floor((audioDownloadedSize * 100) / audioSize) + "%");

					/*for(let i = 0; i < videoBuffersLength + audioBuffersLength; i++){	
						process.stdout.moveCursor(0, -1);
						process.stdout.clearLine(0);
					};*/

					/*console.clear();

					for(let i = 0; i < videoBuffersLength; i++){
						console.log("[Video] Buffer (" + i + ") = ", videoBuffers[i]);						
					};
					for(let i = 0; i < audioBuffersLength; i++){
						console.log("[Audio] Buffer (" + i + ") = ", audioBuffers[i]);						
					};*/
					
					//process.stdout.write("\rDownloading video [" + Math.round((videoDownloadedSize * 100) / videoSize) + "%]\nDownloading audio [" + Math.round((audioDownloadedSize * 100) / audioSize) + "%]");
		
				}else {
	
					process.stdout.write("\r[Info] Downloading video: " + Math.floor((videoDownloadedSize * 100) / videoSize) + "%");


					/*for(let i = 0; i < videoBuffersLength; i++){	
						process.stdout.moveCursor(0, -1);
						process.stdout.clearLine(0);
					}; 
	
					console.clear();

					for(let i = 0; i < videoBuffersLength; i++){
						console.log("[Video] Buffer (" + i + ") = ", videoBuffers[i]);						
					};*/
			
					//process.stdout.write("\rDownloading video [" + Math.round((videoDownloadedSize * 100) / videoSize) + "%]");				

				};

			});
		
			socket.on("error", (err) => { if(err) this.emit("error", err); });

			socket.on("end", () => { 
			
				videoBuffersFinished++;

				if(videoBuffersFinished === videoBuffersLength){
					if(isAudioDownloaded || !audioFile) 
						DownloadEvents.emit("finish");
					else isVideoDownloaded = true;
				}; 
				
			});

		});

		this.on("audio-socket", (socket, index) => {
		
			socket.on("data", (buff) => {
	
				audioDownloadedSize += buff.length;

				if(!audioBuffers[index]) audioBuffers[index] = buff;
				else audioBuffers[index] = Buffer.concat([audioBuffers[index], buff]);
			
				if(downloadInfo.video){
					
					process.stdout.write("\r[Info] Downloading video: " + Math.floor((videoDownloadedSize * 100) / videoSize) + "%\t|\t Downloading audio: " + Math.floor((audioDownloadedSize * 100) / audioSize) + "%");

					/*for(let i = 0; i < videoBuffersLength + audioBuffersLength; i++){	
						process.stdout.moveCursor(0, -1);
						process.stdout.clearLine(0);
					};*/
	
					/*console.clear();

					for(let i = 0; i < videoBuffersLength; i++){
						console.log("[Video] Buffer (" + i + ") = ", videoBuffers[i]);						
					};
					for(let i = 0; i < audioBuffersLength; i++){
						console.log("[Audio] Buffer (" + i + ") = ", audioBuffers[i]);						
					};*/
					
					//process.stdout.write("\rDownloading video [" + Math.round((videoDownloadedSize * 100) / videoSize) + "%]\nDownloading audio [" + Math.round((audioDownloadedSize * 100) / audioSize) + "%]");
		
				}else {
	
					process.stdout.write("\r[Info] Downloading video: " + Math.floor((videoDownloadedSize * 100) / videoSize) + "%\t|\t Downloading audio: " + Math.floor((audioDownloadedSize * 100) / audioSize) + "%");

					/*for(let i = 0; i < audioBuffersLength; i++){	
						process.stdout.moveCursor(0, -1);
						process.stdout.clearLine(0);
					};

					console.clear();

					for(let i = 0; i < audioBuffersLength; i++){
						console.log("[Audio] Buffer (" + i + ") = ", audioBuffers[i]);						
					};*/
			
					//process.stdout.write("\rDownloading video [" + Math.round((videoDownloadedSize * 100) / videoSize) + "%]");				

				};

		
			});
		
			socket.on("error", (err) => { if(err) this.emit("error", err); });

			socket.on("end", () => { 

				audioBuffersFinished++;
						
				if(audioBuffersFinished === audioBuffersLength){
					
					if(isVideoDownloaded || !videoFile){
						DownloadEvents.emit("finish");
					}else isAudioDownloaded = true;
				};
		
			});

			//console.log(info);

		});

		DownloadEvents.on("finish", (index) => {
				
			console.log("\nFinish downloading!");
				
			if(videoFile) 
				fs.writeFileSync(videoFile, Buffer.concat(videoBuffers));
			if(audioFile)
				fs.writeFileSync(audioFile, Buffer.concat(audioBuffers));		
	
			if(videoFile && audioFile){
					
				console.log("Wait a moment...");

				let platform = os.platform();
				let ffmpegPath;

				if(platform === "win32"){

					ffmpegPath = ffmpeg.winPath;						

				}else if(platform === "linux"){

					ffmpegPath = ffmpeg.linuxPath;

				}else { 
					let err = new Error("No suported plataform for ffmpeg!");
					this.emit("error", err);
				};

				let command = ffmpegPath + "/ffmpeg -y -i \"" + videoFile + "\" -i \"" + audioFile + "\" -shortest \"" + opath + "/output.mp4\"";
				cprocess.exec(command, (err, stderr, stdout) => {

					if(err) this.emit("error", err)
					else if(stderr){
						let err = new Error(stderr);
						this.emit("error", err);
					}else {
												
						err = fs.rmSync(videoFile);
						err = fs.rmSync(audioFile);
						err = fs.renameSync(opath + "/output.mp4", opath + "/" + this.filter_bad_chars(title) + ".mp4");
						this.emit("download-finished");
					};
					
				});

			};

		});				
	
	};

};

util.inherits(Downloader, EventEmitter);

module.exports = Downloader;
