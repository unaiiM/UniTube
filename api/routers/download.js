const path = __dirname;
const Downloader = require("../lib/yt-downloader");
const fs = require("fs");
const express = require("express");
const router = express.Router();
var isDownloadingVideo = false;

router.use(express.urlencoded());

router.route("/")
	.get((req, res) => {

		let options = req.query.options;
		let url = req.query.url;
		console.log(req.query.url);		

		if(!options){
			let args = {
				video : {
					quality : "[Required] Here you can put 360 for example or any compatible quality with the video.",
					mimeType : "[No required] Here you can put video/webm for example."	
				},
				audio : {

					quality : "[Required] Here you can put low or medium or high for example or any compatible quality with the audio of the video.",
	             	                mimeType : "[No required] Here you can put audio/webm for example."
				}
			};	

			res.json({ options: args });
			return;	
		};

		options = JSON.parse(options);
		let downloader = new Downloader(url);
		downloader.load();

		let format = {};

		downloader.on("load", () => {

			options = downloader.checkDownloadOptions(options);
			
			if(options.audio){
				format.audio = downloader.get_format("audio", options.audio.quality, options.audio.mimeType);
				format.audio.type = options.audio.mimeType;
			};

			if(options.video){
				format.video = downloader.get_format("video", options.video.quality, options.video.mimeType);	
				format.video.type = options.video.mimeType;
			};
		
			res.status(200).json(format);

		});

		downloader.on("error", (err) => {
		
			res.status(500).json(err);	
			
		});

	});

router.route("/all")
	.get((req, res) => {
		
		let url = req.query.url;

		if(!url){
			res.status(500).json({ error : "Undefined url!" });
		}else {

			let downloader = new Downloader(url);

			downloader.load();

			downloader.on("load", () => {
				
				/*console.log(downloader.cipher.mfdecode.toString());

				let keys = Object.keys(downloader.cipher.ofdecode);
				keys.forEach((key) => {

					console.log(key + ": ", downloader.cipher.ofdecode[key].toString());

				});*/
		
				res.status(200).json(downloader.adaptiveFormats);
			});


			downloader.on("error", (err) => {

				res.status(500).json({ error : err });

			});

		};
	});

router.route("/download")
	.post((req, res) => {

		let options = req.body.options;
		let url = req.body.url;

		if(isDownloadingVideo){
			res.status(500).json({ error: "A video download is in process!" });
		}else if(!options){
			res.status(500).json({ error: "Options not defined!" + JSON.stringify(req.body)});			
		}else if(!url){
			res.status(500).json({ error: "Undefined url!" });			
		}else {


			function removeTmpFiles(){
				let tmpPath = path + "/../tmp";
				let files = fs.readdirSync(tmpPath);
		
				for(let i = 0; i < files.length; i++){;
		
					let file = files[i];
		
					try {
						fs.unlinkSync(tmpPath + "/" + file);
					} catch(err){
						res.status(500).json({ error : err });
						break;
					};
		
				};
		
			};

			removeTmpFiles();

			try {
				options = JSON.parse(options);
			} catch (err) {
				res.status(500).json({ error: "Error JSON.parse() !" + options});	
			}
			
			isDownloadingVideo = true;
			let downloader = new Downloader(url);

			downloader.load();

			downloader.on("load", () => {

				downloader.download(options,  path + "/../tmp");

				downloader.on("download-finished", (file) => {

					isDownloadingVideo = false;

					res.status(200).sendFile(file);

				});

			});

			downloader.on("error", (err) => {

				res.status(err).json({ error : err });

			});

		};

	});


module.exports = router;
