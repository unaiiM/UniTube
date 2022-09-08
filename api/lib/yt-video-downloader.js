const https = require("https");

class Downloader {
	
	constructor (url) {

		this.url = this.check_url(url);
		this.formats = undefined;
	};

	async load(){

		this.yt_video_source = await this.get_yt_video_source();
		this.ytipc = this.get_ytipc();

		this.base_js_url = this.get_base_js_url();
		this.base_js_source = await this.get_base_js_source();
	
		this.cipher = {};
		this.cipher.fname = this.get_decode_function_name(),	
		this.cipher.mfdecode = this.get_main_decode_function()
		this.cipher.ofname = this.get_object_decode_functions_name();
		this.cipher.ofdecode = this.get_object_decode_functions();
	
		this.formats = this.get_formats();
		this.adaptiveFormats = this.get_adaptive_formats();
	}

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
				res.on("end", () => resolv(data));

			});

		});

		return content;

	};

	get_ytipc(){

		let content = this.yt_video_source;

		let ytInitialPlayerResponse = undefined;
		
		let start = content.indexOf("var ytInitialPlayerResponse =");
		start += "var ytInitialPlayerResponse =".length;
		let end = (content.slice(start, content.length)).indexOf("</script>") + start - 1; // - 1 for the final ; not allowed in JSON

		ytInitialPlayerResponse = content.slice(start, end);
		ytInitialPlayerResponse = JSON.parse(ytInitialPlayerResponse);
		
		return ytInitialPlayerResponse;
	};

	get_base_js_url(){

		let ytvs = this.yt_video_source;
	
		let start = ytvs.indexOf('"jsUrl":"') + '"jsUrl:""'.length;
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
				res.on("end", () => resolv(data));

			});

		});

		return content;
	
	}

	get_decode_function_name(){

		let content = this.base_js_source;
		
		let start = content.match(/&&\(.*=.*\(decodeURIComponent\(\w\)\)/).index;
		start += (content.slice(start, content.length)).indexOf("=") + 1; 
		let end = (content.slice(start, content.length)).indexOf("(") + start;
		
		let fname = content.slice(start, end);

		return fname; 

	};


	get_main_decode_function(){

		let fname = this.cipher.fname;
		let content = this.base_js_source;	
			
		let fdecode = undefined;


		let start = content.match(fname + "=function(.*){");
		start = start.index + fname.length + 1;
		let end = (content.slice(start, content.length)).indexOf("};") + start + 1;
		
		let fcontent = content.slice(start, end);

		eval("fdecode="+ fcontent);

		return fdecode;	
	
	}

	get_object_decode_functions_name(){
		
		let mfdecode = (this.cipher.mfdecode).toString();

		let start = mfdecode.match(/;.*..*(.*);/).index + 1;
		let end = (mfdecode.slice(start, mfdecode.length)).indexOf(".") + start;

		let ofname = mfdecode.slice(start, end);
		
		return ofname;
	};

	get_object_decode_functions(){

		let ofname = this.cipher.ofname;
		let content = this.base_js_source;

		let start = content.indexOf("var " + ofname + "=") + ("var " + ofname + "=").length;
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

	decode_url(url){

		let encoded = ["%3F", "%3D", "%26"];
		let decoded = ["?", "=", "&"];

		for(let i = 0; i < encoded.length; i++){
			url = url.replaceAll(encoded[i], decoded[i]);
		};

		return url;
	
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


	async download(mimeType = 'mp4', quality = 360){
	
		let url = this.formats[0].url;	
		let fileSize = Number(this.formats[0].contentLength);
		let downloadedSize = 0;

		let content = await new Promise((resolv, reject) => {
			
			let data = "";

			https.get(url, (res) => {
	
				res.on("data", (buff) => {
				
					data += buff.toString();
					downloadedSize += buff.length;	
					
					let currentPercent = Math.round((downloadedSize * 100) / fileSize);
					process.stdout.write("\rDownloading [" + currentPercent + "%]");
				
				});
				
				res.on("end", () => resolv(data));

			});

		});

			
	
	}

};

module.exports = Downloader;
