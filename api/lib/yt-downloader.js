const https = require("https");
const fs = require("fs");

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
	
		this.cipher = {};						// cipher object
		this.cipher.mfname = this.get_decode_function_name();		// name of the main decode function
		this.cipher.mfdecode = this.get_main_decode_function();		// statments block of decode function
		this.cipher.ofname = this.get_object_decode_functions_name();   // name of the object of the subfunctions of the decode function
		this.cipher.ofdecode = this.get_object_decode_functions();	// block content of the subfunctions object
	
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
				res.on("error", (err) => throw err);
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
				res.on("error", (err) => throw err);
				res.on("end", () => resolv(data));

			});

		});

		return content;
	
	}

	get_decode_function_name(){

		let content = this.base_js_source;
		
		let start = content.match(/&&\(.*=.*\(decodeURIComponent\(\w\)\)/);
		if(start === null) throw new Error("Can't find the decode function name on base.js source!");
		start = start.index;
		start += (content.slice(start, content.length)).indexOf("=") + 1; 
		let end = (content.slice(start, content.length)).indexOf("(") + start;
		
		let fname = content.slice(start, end);

		return fname; 

	};


	get_main_decode_function(){

		let fname = this.cipher.mfname;
		let content = this.base_js_source;	
			
		let fdecode;

		let start = content.match(fname + "=function(.*){");
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
		start = start.index;

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
				let url = query['url'] + "&" + query["sp"] + "=" + s;
				
				formats[i]["url"] = url;

			}else continue;

		};	
	
		return formats;

	};


	get_adaptive_formats(){

		let ytipc = this.ytipc;
		let formats = ytipc.streamingData.adaptiveFormats;
		
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
				let url = query['url'] + "&" + query["sp"] + "=" + s;
				
				formats[i]["url"] = url;

			}else continue;

		};	

		return formats;

	};

	async download(mimeType = 'mp4', quality){

		this.format = this.get_format();	
		this.title = this.get_title();
		await this.download_data();

	}

	get_format(mimeType = 'video/mp4', quality = '360p'){
	
		/* Quality : */
		mimeType = mimeType.split("/");
		let type = mimeType[0];
		let format = mimeType[1];
		
		if(type !== 'video' && type !== 'audio') throw new Error("Bad mimeType, error detecting the type, please specifiy audio/mp4 | audio/webm or video/mp4 video/webm.");

		this.formatType = format;

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
		console.log(selected);	
		return selected;

	};

	get_title(){

		let ytipc = this.ytipc;
		
		return ytipc.videoDetails.title;

	};

	filter_bad_chars(str){

		let BLACKLIST = /[<>:"\/\\|?*]/;
		let FOUND = [];
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

	async download_data(path = '.'){

		let format = this.format;
		let fileName = this.title + "." + this.formatType;
		fileName = this.filter_bad_chars(fileName);
		console.log(fileName);
		let url = format.url;	
		let fileSize = Number(format.contentLength);
		let downloadedSize = 0;

		let dataBuffer = await new Promise((resolv, reject) => {
			
			let buffers = [];

			https.get(url, (res) => {
	
				res.on("data", (buff) => {
				
					buffers.push(buff);
					downloadedSize += buff.length;

					let currentPercent = Math.round((downloadedSize * 100) / fileSize);
					process.stdout.write("\rDownloading [" + currentPercent + "%]");
				
				});
				
				res.on("end", () => resolv(Buffer.concat(buffers)));

			});

		});

		let err = fs.writeFileSync(path + "/" + fileName, dataBuffer);
		
		if(err) throw err;

		return content;	
	
	};

};

module.exports = Downloader;
