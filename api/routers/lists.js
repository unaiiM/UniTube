const path = __dirname;
const fs = require("fs");
const express = require("express");
const router = new express.Router();
const dbPath = path + "/../db/lists.json";
const db = require(path + "/../db/lists.json");
/*
const configPath = path + "/../db/config.json";
const config = require(path + "/../db/config.json");
*/
const Downloader = require(path + "/../lib/yt-downloader");


function updateDatabase(){

	try {
		fs.writeFileSync(dbPath, JSON.stringify(db));
	} catch(err){
		return err;
	};

	return;

};

router.route("/")
	.get((req, res) => {
		let lists = [];

		db.forEach((list) => lists.push({ 
			title : list.title,
			img : (list.list.length === 0) ?  "/img/playlist-img.jpg" : list.list[0].thumbnail
		}));

		res.status(200).json(lists);
	});

router.route("/create")
	.get((req, res) => {
		let name = req.query.name;
		let img = req.query.img;
	
		if(!name){
			res.status(500).json({ error : "Name not defined!"});
			return;
		}else {

			db.push({
				title : name,
				img : img,
				list : []
			});			
			
			let err = updateDatabase();

			if(err) res.status(500).json({ error : err});
			else res.status(200).json({ msg : "Created sucessfully!"});
		};

	});

router.route("/:list/change-name")
	.get((req, res) => {

		let list = Number(req.params.list) - 1; // id 
		let newName = req.query.name;

		if(!newName){
			res.status(500).json({ error : "New name not defined!"});
			return;
		}else if(!db[list]){
			res.status(500).json({ error : "Another playlist has that name!"});
			return;
		}else { 
			db[list].title = newName;

			let err = updateDatabase();

			if(err) res.status(500).json({ error : err});
			else res.status(200).json({ msg : "The name of the list edited sucessfully!"});
		};

	});

router.route("/:list/change-position")
	.get((req, res) => {

		let list = Number(req.params.list) - 1; // id 
		let pos = Number(req.query.pos);
		let npos = Number(req.query.npos);

		if(!pos){
			res.status(500).json({ error : "Item position not defined!"});
			return;
		}else if(!npos){
			res.status(500).json({ error : "New item position not defined!"});
			return;
		}else if(pos === npos){
			res.status(500).json({ error : "Same position, nothing to do!"});
			return;
		}else if(!db[list]){
			res.status(500).json({ error : "Another playlist has that name!"});
			return;
		}else if(db[list].list.length < npos || db[list].list.length < pos || pos < 1 || npos < 1){
			res.status(500).json({ error : "Invalid position!" });
			return;
		}else {

			pos--;
			npos--;

			let arrList = db[list].list;

			if(npos > pos){
				let tmp = arrList[npos];
				arrList[npos] = arrList[pos];

				let last = arrList[npos];

				for(let i = npos + 1; i < arrList.length; i++){
					let current = arrList[i];
					arrList[i] = last;
					last = current;
				};

				arrList.push(last);
	
				arrList[npos] = tmp;
				arrList.splice(pos, 1); // delete init pos

			}else {

				let tmp = arrList[npos];
				arrList[npos] = arrList[pos];

				arrList.splice(pos, 1); // delete init pos

				let last = arrList[npos + 1];

				for(let i = npos + 2; i < arrList.length; i++){
					let current = arrList[i];
					arrList[i] = last;
					last = current;
				};

				arrList.push(last);

				arrList[npos + 1] = tmp;

			};

			let err = updateDatabase();

			if(err) res.status(500).json({ error : err });
			else res.status(200).json({ msg : "Position updated sucessfully!" });

		}

	});

router.route("/:list")
	.get((req, res) => {
		let list = Number(req.params.list) - 1; // id
		
		if(!db[list]){
			res.status(400).json({ error : "List not found!"});
		}else {
			let links = db[list];
			res.status(200).json(db[list].list)
		}
	});

router.route("/:list/add")
	.get((req, res) => {
		let list = Number(req.params.list) - 1;
		let url = req.query.url;	

		if(!db[list]){
			res.status(500).json({ error : "List not found!"});
		}else if(!url){
			res.status(500).json({ error : "Url not defined!"});
		}else {
			
			let download = new Downloader(url);
			url = download.check_url(url);

			if(!url) 
				res.status(500).json({ error : "Bad url entred!"});
			else {
				download.load();
				download.on("load", () => {
	
					db[list].list.push({
						url : url,
						title : download.get_title(),
						thumbnail : download.get_thumbnail(),
						thumbnail_max_resolution : download.get_thumbnail_max_resolution()
					});			
					
					let err = updateDatabase();

					if(err) res.status(500).json({ error : err });
					else res.status(200).json({ msg : "Video added to the list!"});
						
				});

				download.on("error", (err) => {

					res.status(500).json({ error : err });
					
				});

			};
		}
	});

router.route("/:list/import")
	.get((req, res) => {
		let list = Number(req.params.list) - 1;
		let url = req.query.url;	

		if(!db[list]){
			res.status(500).json({ error : "List not found!"});
		}else if(!url){
			res.status(500).json({ error : "Url not defined!"});
		}else {
			
			let download = new Downloader(url);
			url = download.check_url(url);

			if(!url) 
				res.status(500).json({ error : "Bad url entred!"});
			else {

				download.get_playlist_items();
	
				let i = 0;

				download.on("error", (err) => {

					res.status(500).json({ error : err });

				});

				download.on("exported", (items) => {

					let itemsInfo = download.playlist_items;
					console.log(itemsInfo);

					items.forEach((item) => {
						
						db[list].list.push({
							url : item,
							title : itemsInfo[i].playlistVideoRenderer.title.runs[0].text,
							thumbnail : itemsInfo[i].playlistVideoRenderer.thumbnail.thumbnails[3].url,
							thumbnail_max_resolution : "https://i.ytimg.com/vi/" + itemsInfo[i].playlistVideoRenderer.videoId + "/maxresdefault.jpg"
						});	

						i++;

					});
					
					let err = updateDatabase();

					if(err) res.status(500).json({ error : err});
					else res.status(200).json({ msg : "Sucessfully imported to the list!"});
						
				});
			};
		}
	});

router.route("/:list/remove-item")
	.get((req, res) => {

		let list = Number(req.params.list) - 1;
		let id = Number(req.query.id);
		
		if(!db[list]){
			res.status(500).json({ error : "List not found!"});
		}else if(!id){
			res.status(500).json({ error : "Undefined ID on url query!"});
		}else{

			id--;
			db[list].list.splice(id, 1);
			//console.log(db[list].list);
		
			let err = updateDatabase();

			if(err) res.status(500).json({ error : err });	
			else res.status(200).json({ msg : "Video removed from the list!"});
		}

	});

router.route("/:list/remove")
	.get((req, res) => {

		let list = Number(req.params.list) - 1;
		
		if(list === undefined){
			res.status(500).json({ error : "Undefined list ID on url params!"});
		}else if(!db[list]){
			res.status(500).json({ error : "List with this ID not found!"});
		}else {
			db.splice(list, 1);

			let err = updateDatabase();

			if(err) res.status(500).json({ error : err});
			else res.status(200).json({ msg : "List sucessfully removed!"});
		};


	});

module.exports = router;
