const path = __dirname;
const PATH = require("path");
const https = require("https");
const util = require('util');
const fs = require("fs");
const os = require("os");
const cprocess = require("child_process");
const ffmpeg = {
	winPath : path + "/ffmpeg/win64",
	linuxPath : path + "/ffmpeg/linux64"
};
const EventEmitter = require("events");

class Downloader {
	
	constructor(url) {

		this.url = url;

	};

	async load(){	
		
		this.url = this.check_url(this.url);

		if(this.url === null){
			return;
		};

		this.yt_source = await this.get_source();	// video source
		this.ytipc = this.get_ytipc(); 					// ytInitialPlayerResponse variable

		if(!this.ytipc){
			return;
		};

		this.base_js_url = this.get_base_js_url();			// base.js url
		console.log(this.base_js_url);
		this.base_js_source = await this.get_base_js_source();		// base.js source
		
		if(this.has_signatureCipher()){
			this.cipher = {};						// cipher object
			this.cipher.mfname = this.get_decode_signature_function_name();		// name of the main decode function
			this.cipher.mfdecode = this.get_decode_signature_function();		// statments block of decode function
			this.cipher.ofname = this.get_object_decode_signature_functions_names();   // name of the object of the subfunctions of the decode function
			this.cipher.ofdecode = this.get_object_decode_signature_functions();	// block content of the subfunctions object
		};	

		this.decode_n_param = this.get_decode_n_function();

		this.title = this.get_title();
		//this.formats = this.get_formats();				// get video formats
		this.adaptiveFormats = this.get_adaptive_formats();		// get video adaptiveFormats
	
		let statusCode = await this.check_formats();	

		if(statusCode === 403){
			this.load();
			return;
		};
	
		this.emit("load");
	};

	async get_playlist_items(){

		this.url = this.check_url(this.url);

		if(this.url === null){
			return;
		};
		
		this.yt_source = await this.get_source();

		let ytid = this.get_ytid();

		let context = this.yt_source.slice(this.yt_source.indexOf('"INNERTUBE_CONTEXT":') + '"INNERTUBE_CONTEXT":'.length, this.yt_source.indexOf(',"INNERTUBE_CONTEXT_CLIENT_NAME"'));
		let list = [];
		let items;

		try {
			items = ytid.contents.twoColumnBrowseResultsRenderer.tabs[0].tabRenderer.content.sectionListRenderer.contents[0].itemSectionRenderer.contents[0].playlistVideoListRenderer.contents;
		}catch(error){
			let err = "Can not load the playlist!";
			this.emit("error", err);
			return;
		};

		let key = this.yt_source.slice(this.yt_source.indexOf('"INNERTUBE_API_KEY":"') + '"INNERTUBE_API_KEY":"'.length, this.yt_source.indexOf('","INNERTUBE_API_VERSION"'));

		this.playlist_items = [];

		for(let i = 0; i < items.length; i++){

			if(i === 100) break;

			let url = "https://www.youtube.com/watch?v=" + items[i].playlistVideoRenderer.videoId;
			list.push(url);

		};

		while(items.length >= 101){

			this.playlist_items = this.playlist_items.concat(items.slice(0, items.length - 1));

			let token = items[100].continuationItemRenderer.continuationEndpoint.continuationCommand.token;
			let body = JSON.stringify({
				"context" : JSON.parse(context),
				"continuation" : token				
			});	

			let response = await new Promise((resolv, reject) => {
					
				let options = {
					hostname : 'www.youtube.com',
					port : 443,
					path : '/youtubei/v1/browse?key=' + key,
					method : 'POST',
					headers: {
						'Content-Type': 'application/json',
						'Content-Length': body.length
					}
				};

				let data = "";

				let req = https.request(options, (res) => {

					res.on("data", (buff) => data += buff.toString());
					res.on("error", (err) => this.emit("error", err));
					res.on("end", () => resolv(JSON.parse(data)));

				});

				console.log(key);

				req.write(body);
				req.end();

			});

			items = response.onResponseReceivedActions[0].appendContinuationItemsAction.continuationItems;

			for(let i = 0; i < items.length; i++){

				if(i === 100) break;
	
				let url = "https://www.youtube.com/watch?v=" + items[i].playlistVideoRenderer.videoId;
				list.push(url);
	
			};

		};		

		this.playlist_items = this.playlist_items.concat(items);

		this.emit("exported", list);

		console.log(list, list.length);

		return list;
	}

	check_url(url){

		// Video ID
		// https://www.youtube.com/watch?v=7d0QGcRXqGg --> 7d0QGcRXqGg
		// https://youtu.be/7d0QGcRXqGg --> 7d0QGcRXqGg
		// embeded ???

		if(url.match(".*:\/\/.*\.youtube.com\/")){
			return url;	
		}else if(url.match(".*:\/\/youtu.be\/")){
			let v = url.split("/")[3];
			this.video_id = v;
			return "https://www.youtube.com/watch?v=" + v;
		}else {
			let err = "Bad url entred! Example: https://youtube.com/watch?v=jUoHX7i03nY";
			this.emit("error", err);
			return null;
		};

	};

	get_source(){

		let url = this.url;	
			
		let content = new Promise((resolv, reject) => {
			
			let data = "";

			https.get(url, (res) => {
	
				res.on("data", (buff) => data += buff.toString());
				res.on("error", (err) => { 
					this.emit("error", err);
					return;
				});
				res.on("end", () => resolv(data));

			});

		});

		return content;

	};

	get_ytid(){

		let content = this.yt_source;

		let ytInitialData;
		
		let start = content.indexOf("var ytInitialData =");
		
		if(start === -1){
			let err = "Can't found the ytInitialPlayerResponse variable on the video source!";
			this.emit("error", err);
			return;
		};

		start += "var ytInitialData =".length;

		let end = (content.slice(start, content.length)).indexOf("</script>") + start - 1; // - 1 for the final ; not allowed in JSON
	

		ytInitialData = content.slice(start, end);
		ytInitialData = JSON.parse(ytInitialData);
		
		return ytInitialData;

	}

	get_ytipc(){

		let content = this.yt_source;

		let ytInitialPlayerResponse;
		
		let start = content.indexOf("var ytInitialPlayerResponse =");
		
		if(start === -1){
			let err = "Can't found the ytInitialPlayerResponse variable on the video source!";
			this.emit("error", err);
			return;
		};

		start += "var ytInitialPlayerResponse =".length;

		let end = (content.slice(start, content.length)).indexOf("</script>") + start - 1; // - 1 for the final ; not allowed in JSON
	

		ytInitialPlayerResponse = content.slice(start, end);
		ytInitialPlayerResponse = JSON.parse(ytInitialPlayerResponse);
		
		return ytInitialPlayerResponse;
	};

	get_base_js_url(){

		let ytvs = this.yt_source;
	
		let start = ytvs.indexOf('"jsUrl":"');
		
		if(start === -1){
			let err = "Can't found the base.js url on the video source!";
			this.emit("error", err);
			return;
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
					this.emit("error", err); 
					return;
				});
				res.on("end", () => resolv(data));

			});

		});

		return content;
	
	}

	 	
	/***
		 Chipher 
				***/

	get_decode_n_function(){

		let content = this.base_js_source;
		let func;

		let start = content.indexOf('function(a){var b=a.split(""),c=[');
		content = content.slice(start, content.length);

		let end = content.indexOf('return b.join("")};') + 'return b.join("")};'.length;
		eval("func=" + content.slice(0, end));

		return func;

	};

	apply_decode_n_param(url){

		let tmp = url.slice(0, url.indexOf('?') + 1);
		url = url.slice(url.indexOf('?') + 1, url.length);
		let query = url.split("&");

		for(let i = 0; i < query.length; i++) {

			let param = query[i].split("=");
			let key = param[0];
			let value = param[1];

			if(key === 'n'){

				value = this.decode_n_param(value);
				query[i] = key + "=" + value;

				break;

			}else continue;

		};

		return (tmp + query.join("&"));

	}

	has_signatureCipher(){

		let ytipc = this.ytipc;

		if(ytipc.streamingData.adaptiveFormats[0].signatureCipher) return true;
		else return false;
	
	};	

	get_decode_signature_function_name(){

		let content = this.base_js_source;
		
		let start = content.match(/&&\(.*=.*\(decodeURIComponent\(.*\)\),.*.set\(.*,encodeURIComponent\(.*\)\)\)/);

		if(start === null){
			let err = "Can't find the decode function name on base.js source!";
			this.emit("error", err);	
			return;
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

	get_decode_signature_function(){

		let fname = this.cipher.mfname;
		let content = this.base_js_source;	
			
		let fdecode;

		let start = content.match(this.double_escape_special_chars(fname) + "=function(.*){");
		
		if(start === null){
			let err = "Can't find the decode function block statments!";
			this.emit("error", err);		
			return;
		};

		start = start.index + fname.length + 1;
		let end = (content.slice(start, content.length)).indexOf("};") + start + 1;
		
		let fcontent = content.slice(start, end);

		eval("fdecode="+ fcontent);
	
		return fdecode;	
	
	}

	get_object_decode_signature_functions_names(){
		
		let mfdecode = (this.cipher.mfdecode).toString();

		let start = mfdecode.match(/;.*..*(.*);/);
		if(start === null){
			let err = "Can't find the name of the decode functions object on the decode function block!";
			this.emit("error", err);
			return;
		};

		start = start.index + 1;

		let end = (mfdecode.slice(start, mfdecode.length)).indexOf(".") + start;

		let ofname = mfdecode.slice(start, end);
		
		return ofname;
	};

	get_object_decode_signature_functions(){

		let ofname = this.cipher.ofname;
		let content = this.base_js_source;
		
		let start = content.indexOf("var " + ofname + "=");
	
		if(start === -1){
			let err = "Can't find the decode functions object variable on the base.js source!";
			this.emit("error", err);
			return;
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


	get_adaptive_formats(){ // and decode Signature Cipher and decode n param

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
			};

			formats[i]["url"] = this.apply_decode_n_param(formats[i]["url"]);

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
			let err = "Undefined quality or type.";
			this.emit("error", err);
			return;
		}else if(type !== 'video' && type !== 'audio'){
			let err = "Bad type defined!";
			this.emit("error", err);
			return;
		};

		if(this.check_quality(quality)){
			let err = "Bad quality defined!";
			this.emit("error", err);
			return;
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
			let err = "None formts found with" + mimeType + " mimeType";
			this.emit("error", err);
			return;
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
		let title = ytipc.videoDetails.title;
		
		return title;
	};

	get_thumbnail(size = 3){
		
		if(size > 3) size = 3;	

		let ytipc = this.ytipc;
		let thumbnail = ytipc.videoDetails.thumbnail.thumbnails[size].url;
			
		return thumbnail;
	};

	get_thumbnail_max_resolution(){
		
		return "https://i.ytimg.com/vi/" + this.video_id + "/maxresdefault.jpg"; 

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

	createDownloadRange(format, sockSize){

		let range = [];
		let size = Math.floor(format.contentLength / sockSize);
		let position = 0;
			
		for(let i = 0; i < sockSize; i++){
			range.push(format.url + "&range=" + (position) + "-" + (position + size - 1));
			position += size; 	
			
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
			video : undefined,
			audio : undefined,
		};
		let defaultOptions = {
			video : {
				quality : 360,
				mimeType: 'video/mp4',
				downloadSocketsSize : 10
			},
			audio : {
				quality : "medium",
				mimeType : 'audio/mp4',	
				downloadSocketsSize : 5
			}
		};

		// default settings
	
		if(!options.video && !options.audio) return defaultOptions;

		if(options.video){

			checkedOptions.video = {};
	
			if(options.video.quality) options.video.quality = Number(options.video.quality);
			if(!options.video.quality) checkedOptions.video.quality = defaultOptions.video.quality
			else if(this.check_quality(options.video.quality)){
				let err = "Bad Quality!";
				this.emit("error", err);
				return;
			}else checkedOptions.video.quality = options.video.quality;

			if(!options.video.mimeType) checkedOptions.video.mimeType = defaultOptions.video.mimeType
			else checkedOptions.video.mimeType = options.video.mimeType;
			
			if(!options.video.downloadSocketsSize) checkedOptions.video.downloadSocketsSize = defaultOptions.video.downloadSocketsSize
			else checkedOptions.video.downloadSocketsSize = options.video.downloadSocketsSize;			 

		};
	

		if(options.audio){

			checkedOptions.audio = {};

			if(!options.audio.quality) checkedOptions.audio.quality = defaultOptions.audio.quality
			else if(this.check_quality(options.audio.quality)){
				let err = "Bad Quality";
				this.emit("error", err);
				return;
			}else checkedOptions.audio.quality = options.audio.quality;
	
			if(!options.audio.mimeType) checkedOptions.audio.mimeType = defaultOptions.audio.mimeType
			else checkedOptions.audio.mimeType = options.audio.mimeType;
					
	
			if(!options.audio.downloadSocketsSize) checkedOptions.audio.downloadSocketsSize = defaultOptions.audio.downloadSocketsSize
			else checkedOptions.audio.downloadSocketsSize = options.audio.downloadSocketsSize;


		};

		//if(!options.downloadRangeSize) checkedOptions.downloadRangeSize = defaultOptions.downloadRangeSize;
	
		console.log("Generated options:\n-------------", checkedOptions, "-------------");

		//this.options = checkedOptions;
	
		return checkedOptions;

	};	

	createDownloadSocketFromRange(options, range){

		options = this.checkDownloadOptions(options);

		let info = {};
	
		if(!range){
			let err = "Undefined range, required parameter!";
			this.emit("error", err);
			return;
		}else if(range.min === undefined || range.max === undefined){
			let err = "Range min or max not specified, example: range : { min : 100, max : 200 }";
			this.emit("error", err);
			return;
		}else if(range.min > range.max){
			let err = "Min range is bigger than max range!";
			this.emit("error", err);
			return;
		};
	
		if(options.video){

			let format = this.get_format("video", options.video.quality, options.video.mimeType);
			format.url += "&range=" + range.min + "-" + range.max;

			info["video"] = {
				format : format
			};

			https.get(format.url, (res) => {

				this.emit("video-range-socket", res);

			});	
	
		};	
	
		if(options.audio){

			let format = this.get_format("audio", options.audio.quality, options.audio.mimeType);
			format.url += "&range=" + range.min + "-" + range.max;

			info["audio"] = {
				format : format
			};

			https.get(format.url, (res) => {

				this.emit("audio-range-socket", res);

			});		

		};		
	
	
	};

	createDownloadSockets(options){ 
		
		options = this.checkDownloadOptions(options);
		let info = {};
	
		if(options.video){
			
			let format = this.get_format("video", options.video.quality, options.video.mimeType);	

			let videoRange = this.createDownloadRange(format, options.video.downloadSocketsSize, options.mimeType);

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
			let audioRange = this.createDownloadRange(format, options.audio.downloadSocketsSize, options.audio.mimeType);
		
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

	async check_formats(){
		/* Some links will throw 403 error, with the correct signature, idk why */

		let formats = this.adaptiveFormats;
	
		let statusCode = new Promise((resolv, reject) => {
			https.get(formats[0].url, (res) => {
				console.log(res.statusCode);
				resolv(res.statusCode);
			});
		});		

		return statusCode;
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
		
			socket.on("error", (err) => { 
				this.emit("error", err); 
				return;
			});

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
	
					process.stdout.write("\rDownloading audio: " + Math.floor((audioDownloadedSize * 100) / audioSize) + "%");

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
		
			socket.on("error", (err) => { 
				this.emit("error", err); 
				return;
			});

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
					let err = "No suported plataform for ffmpeg!";
					this.emit("error", err);
					return;
				};

				let command = ffmpegPath + "/ffmpeg -y -i \"" + videoFile + "\" -i \"" + audioFile + "\" -shortest \"" + opath + "/output.mp4\"";
				cprocess.exec(command, (err, stderr, stdout) => {

					if(err){
						this.emit("error", err)
						return;
					}else if(stderr){
						let err = stderr;
						this.emit("error", err);
						return;
					}else {
						
						let file = opath + "/" + this.filter_bad_chars(title) + ".mp4";
						file = PATH.resolve(file);

						err = fs.rmSync(videoFile);
						err = fs.rmSync(audioFile);
						err = fs.renameSync(opath + "/output.mp4", file);
						console.log(err);
						this.emit("download-finished", file);
					};
					
				});

			}else {
				if(audioFile) 
					this.emit("download-finished", PATH.resolve(audioFile));
				else if(videoFile)
					this.emit("download-finished", PATH.resolve(videoFile));
			};

		});				
	
	};

};

util.inherits(Downloader, EventEmitter);

module.exports = Downloader;
