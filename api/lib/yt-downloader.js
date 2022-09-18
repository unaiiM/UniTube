const https = require("https");
const util = require('util');
const fs = require("fs");
const EventEmitter = require("events");

class Downloader {
	
	constructor (url) {

		this.url = this.check_url(url);
		this.formats = undefined;
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
		this.formats = this.get_formats();				// get video formats
		this.adaptiveFormats = this.get_adaptive_formats();		// get video adaptiveFormats
	};

	check_url(url){

		// Video ID
		// https://www.youtube.com/watch?v=7d0QGcRXqGg --> 7d0QGcRXqGg
		// https://youtu.be/7d0QGcRXqGg --> 7d0QGcRXqGg
		// embeded ???

		return url;

	};

	get_yt_video_source(){

		let url = this.url;	
		//console.log(redirect)
			
		let content = new Promise((resolv, reject) => {
			
			let data = "";

			https.get(url, (res) => {
	
				res.on("data", (buff) => data += buff.toString());
				res.on("error", (err) => { 
					if(err) throw err; 
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
		if(start === -1) throw new Error("Can't found the ytInitialPlayerResponse variable on the video source!");
		start += "var ytInitialPlayerResponse =".length;

		let end = (content.slice(start, content.length)).indexOf("</script>") + start - 1; // - 1 for the final ; not allowed in JSON
	

		ytInitialPlayerResponse = content.slice(start, end);
		ytInitialPlayerResponse = JSON.parse(ytInitialPlayerResponse);
		
		return ytInitialPlayerResponse;
	};

	get_base_js_url(){

		let ytvs = this.yt_video_source;
	
		let start = ytvs.indexOf('"jsUrl":"');
		if(start === -1) throw new Error("Can't found the base.js url on the video source!");
		start += '"jsUrl:""'.length;

		let end = (ytvs.slice(start, ytvs.length)).indexOf('base.js"') + 'base.js"'.length + start - 1;
		
		let base = ytvs.slice(start, end);
		base = "https://www.youtube.com" + base;
		console.log(base);
		return base;

	}

	get_base_js_source(){

		let url = this.base_js_url;	
			
		let content = new Promise((resolv, reject) => {
			
			let data = "";

			https.get(url, (res) => {
	
				res.on("data", (buff) => data += buff.toString());
				res.on("error", (err) => {
					if(err) throw err; 
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

		if(ytipc.streamingData.adaptiveFormats[0].signatureCipher || ytipc.streamingData.formats[0].signatureCipher) return true;
		else return false;
	
	}	

	get_decode_function_name(){

		let content = this.base_js_source;
		
		let start = content.match(/&&\(.*=.*\(decodeURIComponent\(.*\)\),.*.set\(.*,encodeURIComponent\(.*\)\)\)/);

		if(start === null) throw new Error("Can't find the decode function name on base.js source!");
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
		
		if(start === null) throw new Error("Can't find the decode function block statments!");
		start = start.index + fname.length + 1;
		let end = (content.slice(start, content.length)).indexOf("};") + start + 1;
		
		let fcontent = content.slice(start, end);

		eval("fdecode="+ fcontent);
	
		return fdecode;	
	
	}

	get_object_decode_functions_name(){
		
		let mfdecode = (this.cipher.mfdecode).toString();

		let start = mfdecode.match(/;.*..*(.*);/);
		if(start === null) throw new Error("Can't find the name of the decode functions object on the decode function block!");
		start = start.index + 1;

		let end = (mfdecode.slice(start, mfdecode.length)).indexOf(".") + start;

		let ofname = mfdecode.slice(start, end);
		
		return ofname;
	};

	get_object_decode_functions(){

		let ofname = this.cipher.ofname;
		let content = this.base_js_source;
		
		let start = content.indexOf("var " + ofname + "=");
		if(start === -1) throw new Error("Can't find the decode functions object variable on the base.js source!");
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

	get_formats(){

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

	};


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

			}else continue;

		};	

		return formats;

	};

	check_quality(quality){

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

	get_format(type, quality){
	
		if(type === 'audio') quality = quality.toUpperCase();

		if(!type || !quality) throw new Error("Undefined quality or type.");
		else if(type !== 'video' && type !== 'audio') throw new Error("Bad type defined!");
		console.log(quality);	
		if(this.check_quality(quality)) throw new Error("Bad quality defined!");

		if(type === 'audio') quality = "AUDIO_QUALITY_" + quality;
		else quality = quality + "p";

		let allFormats = this.formats.concat(this.adaptiveFormats);	
		let selectedFormats = [];	
	
		allFormats.forEach((item) => {

			let itemType = item.mimeType.split("/")[0];
		
			if(itemType === type) selectedFormats.push(item);			
	
		});		

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


	createDownloadSocket(options = { video : { quality : 360 } }){ 
		
		/*

			video : {
				quality : 360,
				type : 'm' # webm |
				audio : true	
			}
			audio : {
				quality : low,
			}

		*/
		
		// mp4 videos with higher quality than 360 will need to download the audio separated

		if(!options.video && !options.audio) throw new Error("None type has been specified!");

		// default settings
		
		if((!options.video.audio || options.video.audio === true) && !options.audio && options.video.quality > 360) options["audio"] = { quality: "medium" };

		if(options.video){
			
			let format = this.get_format("video", options.video.quality);	
				
			https.get(format.url, (res) => {
	
				this.emit("video-socket", format, res);		
			
			});
			
		};
	
		if(options.audio){
			console.log("aaa");	
			let format = this.get_format("audio", options.audio.quality);
		
			https.get(format.url, (res) => {
	
				this.emit("audio-socket", format, res);		
			
			});
			
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
			default:
				type = "none";
		
		};

		return type;
	};

	download(options, path = "."){	

		this.createDownloadSocket(options);			
	
		let title = this.get_title();

		let videoFile;
		let audioFile;

		let isAudioDownloaded = false;
		let isVideoDownloaded = false;

		let videoDownloadedSize = 0;
		let audioDownloadedSize = 0;
		
		let audioSize;
		let videoSize;

		let DownloadEvents = new EventEmitter();

		this.on("video-socket", (info, socket) => {

			let mimeType = info.mimeType.match(/.*;/);
			mimeType = mimeType[0].slice(0, mimeType[0].length - 1);
			
			let type = this.check_file_type(mimeType);
			videoFile = path + "/" + this.filter_bad_chars(title) + "." + type;			
			
			let err;
			err = fs.writeFileSync(videoFile, "");

			videoSize = Number(info.contentLength); 
			
			socket.on("data", (buff) => {

				err = fs.appendFileSync(videoFile, buff);

				videoDownloadedSize += buff.length;
				
				if(audioSize){
				
					process.stdout.clearLine(0);
					process.stdout.moveCursor(0, -1);
					process.stdout.clearLine(0);


					process.stdout.write("\rDownloading video [" + Math.round((videoDownloadedSize * 100) / videoSize) + "%]\nDownloading audio [" + Math.round((audioDownloadedSize * 100) / audioSize) + "%]");
		
				}else {

					process.stdout.write("\rDownloading video [" + Math.round((videoDownloadedSize * 100) / videoSize) + "%]");				

				};

			});
		
			socket.on("error", (err) => err = err);

			socket.on("end", () => { 

				if((audioFile && isAudioDownloaded) || !audioFile) DownloadEvents.emit("finished", videoFile, audioFile);

				else isVideoDownloaded = true;
			});

			//console.log(info);
		});

		this.on("audio-socket", (info, socket) => {
	
			let mimeType = info.mimeType.match(/.*;/);
			mimeType = mimeType[0].slice(0, mimeType[0].length - 1);
			
			let type = this.check_file_type(mimeType);
			audioFile = path + "/" + this.filter_bad_chars(title) + "." + type;			
			
			let err;
			err = fs.writeFileSync(audioFile, "");

			audioSize = Number(info.contentLength); 
			
			socket.on("data", (buff) => {

				err = fs.appendFileSync(audioFile, buff);

				audioDownloadedSize += buff.length;
				
				if(videoSize){

					process.stdout.clearLine(0);
					process.stdout.moveCursor(0, -1);
					process.stdout.clearLine(0);

					process.stdout.write("\rDownloading video [" + Math.round((videoDownloadedSize * 100) / videoSize) + "%]\nDownloading audio [" + Math.round((audioDownloadedSize * 100) / audioSize) + "%]");
		
				}else {

					process.stdout.write("\rDownloading audio [" + Math.round((audioDownloadedSize * 100) / audioSize) + "%]");				

				};

			});
		
			socket.on("error", (err) => err = err);

			socket.on("end", () => { 

				if((videoFile && isVideoDownloaded) || !videoFile) DownloadEvents.emit("finished", videoFile, audioFile);

				else isAudioDownloaded = true;
			});

			//console.log(info);

			DownloadEvents.on("finished", (videoFile, audioFile) => {

				console.log("Finished!");				

			});			

		});	
	
	};

};

util.inherits(Downloader, EventEmitter);

module.exports = Downloader;
