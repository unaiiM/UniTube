/*
	CONSTANTS
*/

const API_HOST = window.location.host;
const API_PORT = 4444;
const API = "http://" + API_HOST + ":" + API_PORT;

const PlaylistsSection = document.querySelector(".playlist-section");
const PlaylistSection = document.querySelector(".list-items");
const AlertSection = document.querySelector(".alert-section");
const VIDEO = document.querySelector(".video-section .video video");
const AUDIO = document.querySelector(".video-section .video audio");
const IMAGE = document.querySelector(".video-section .video img");

const VolumeButton = document.querySelector(".video-bar-volume img");
const VolumeProgressBar = document.querySelector(".video-bar-volume progress")
const ProgressBar = document.querySelector(".video-progress progress");
const PlayPauseButton = document.querySelector("#video-play-pause")
const RewindButton = document.querySelector("#video-rewind");
const ForwardButton = document.querySelector("#video-forward");
const VideoSectionTitle = document.querySelector(".video-info h1");
const VideoConfigButton = document.querySelector("#video-button-config");
const VideoConfig = document.querySelector(".video-config");
const VideoConfigOnlyAudio = document.querySelector(".video-config-only-audio input");
const VideoConfigQuality = document.querySelector(".video-config-quality select");
const VideoConfigDownload = document.querySelector(".video-config-download");
const changeColor = document.querySelector(".app-options-background-color input");

/*
	VARIABLES
*/

var VideoStatus = 0;
var VideoHandlerInterval;
var CurrentVideoID;
var CurrentPlaylistID;
var CurrentVideoPlaylistID;
//var CurrentVideoPlaylistLength;
var CurrentPlayingPlaylistItems;
var CurrentVideoAvailableQualities = { audio : {}, video : {}};
var CurrentPlaylists;

var CurrentVideoDuration;
var CurrentVideoTime;
var MIN_PROGRESS = 0;
var MAX_PROGRESS = 100;

var CurrentVideoListItem;

var isVideoConfigOpen;
var isLoadingVideo = false;
var isOnlyAudio = false;

var isVideoMuted = false;
var CurrentVideoVolume;

var CurrentVideoSourcesFragemnt;

var CurrentVideoQuality;
var CurrentAudioQuality;

var isCreatingPlaylist = false;
var isDeletingPlaylist = false;
var isEditingPlaylist;
var isSearching;
var isAddingVideo = false;
var isDownloading = false;
var isMovingItem = false;;
var lastItemClickedID;
var lastItemClickedPlaylistID;
var lastItemClickedPlaylist;
var isVideoInBackground = false;
var isVideoLoaded;
var isAudioLoaded;
var isChangingColor = false;

// play or pause if is only audio

/*
	FUNCIONALITIES
*/

function alert(msg){

	let textElement = AlertSection.querySelector("p");
	textElement.innerText = msg;

	AlertSection.setAttribute("style", "top: 0;");

	let alertTimeout = setTimeout(() => { AlertSection.removeAttribute("style") }, 2000);

	return alertTimeout;
}

async function playVideo(){
	if(isOnlyAudio && AUDIO.paused){
		await AUDIO.play();
	}else if(!isVideoInBackground && AUDIO.paused){
		await AUDIO.play();
	}else if(VIDEO.paused || AUDIO.paused){
		await VIDEO.play();
		await AUDIO.play();
		VIDEO.currentTime = AUDIO.currentTime;	
	}else{
		return false;
	};

	PlayPauseButton.setAttribute("src", "/img/pause-button.png");		
	VideoStatus = 1;
	return true;
}

async function pauseVideo(){
	if(isOnlyAudio && !AUDIO.paused){
		await AUDIO.pause();
	}else if(!isVideoInBackground && AUDIO.paused){
		await AUDIO.play();
	}else if(!VIDEO.paused || !AUDIO.paused){
		await VIDEO.pause();
		await AUDIO.pause();
		//VIDEO.currentTime = AUDIO.currentTime;
	}else {
		return false;
	};

	PlayPauseButton.setAttribute("src", "/img/play-button.png");
	VideoStatus = 0;
	return true;	
}

function removeVideo(){

	while(VIDEO.firstChild){
		VIDEO.removeChild(VIDEO.lastChild);
	};

	VIDEO.load();

	while(AUDIO.firstChild){
		AUDIO.removeChild(AUDIO.lastChild);
	};

	AUDIO.load();

	CurrentVideoID = undefined;	

	pauseVideo();

	return;

};

function PlayOrPause(){
	if(VideoStatus === 0) playVideo();
	else pauseVideo();
};

function closeVideoConfig(){
	
	if(isVideoConfigOpen){
		VideoConfig.setAttribute("style", "display: none;");
		isVideoConfigOpen = false;
		return true;
	};

	return false;

};

function openVideoConfig(){

	if(!isVideoConfigOpen){
		VideoConfig.setAttribute("style", "display: block;");
		isVideoConfigOpen = true;
		return true;
	};

	return false;

}


/*
	FUNCTIONS LOAD PROCESS
*/


function loadVideoBar(){

	document.addEventListener("keydown", (e) => {

		if(e.keyCode === 32 && !(e.target instanceof HTMLInputElement)){
			e.preventDefault();
			PlayOrPause();
		};
			
	});

	document.addEventListener("click", (e) => {

		console.log(e.target);

		if(e.target.getAttribute("id") === "video-button-config"){

			return;

		}else {

			let isVideoConfig = false;
			let last = e.target;

			while(last instanceof HTMLElement){

				//console.log(last);

				if(last.getAttribute("class") === "video-config"){
					isVideoConfig = true;
					break;
				}else last = last.parentNode;

			};

			if(!isVideoConfig) closeVideoConfig();

		};
		
			
	});

	PlayPauseButton.addEventListener("click", () => {

		PlayOrPause();

	});
	
	RewindButton.addEventListener("click", () => {

		rewindVideo();

	});

	ForwardButton.addEventListener("click", () => {

		forwardVideo();

	});
	
	VolumeButton.addEventListener("click", () => {
		
		if(isVideoMuted){
 	
			VolumeButton.setAttribute("src", "/img/volume.png");	
			AUDIO.volume = CurrentVideoVolume;
			VolumeProgressBar.setAttribute("value", CurrentVideoVolume * 100);
			isVideoMuted = false;

	
		}else {

			CurrentVideoVolume = AUDIO.volume; 	
			VolumeButton.setAttribute("src", "/img/volume-mute.png");	
			AUDIO.volume = 0;
			isVideoMuted = true;	

		}

	});	
	
	
	return;

};

async function loadPlaylists(){

	while(PlaylistsSection.firstChild){
		PlaylistsSection.firstChild.remove();
	};
	
	let playlists = await new Promise((resolv, reject) => {
	
		fetch(API + "/lists")
			.then((res) => {
				res.json()
					.then((json) => {
						resolv(json);
					});
				});	
			
	});
	
	let id = 0;
	CurrentPlaylists = [];

	playlists.forEach((playlist) => {
		
		CurrentPlaylists.push(playlist.title);

		let pl = document.createElement("div");
		pl.setAttribute("class", "playlist");
		pl.setAttribute("id", id);
		
		if(CurrentPlaylistID !== undefined){
			if(id === CurrentPlaylistID) pl.setAttribute("class", "playlist playlist-active");
				//pl.setAttribute("style", "background-color: #34495E; color: white;"); 
		};
		
		id++;


		let plDivImg = document.createElement("div");
		plDivImg.setAttribute("class", "playlist-image");
	
		let plImg = document.createElement("img");
		plImg.setAttribute("src", playlist.img);
		plDivImg.appendChild(plImg);
		pl.appendChild(plDivImg);

		let plDivInfo = document.createElement("div");
		plDivInfo.setAttribute("class", "playlist-info");
		
		let plInfoTitle = document.createElement("h1");
		plInfoTitle.innerText = playlist.title;
		plDivInfo.appendChild(plInfoTitle);
		pl.appendChild(plDivInfo);
	
		PlaylistsSection.appendChild(pl);
	
		pl.addEventListener("click", (e) => {
	
			let ID = Number(pl.getAttribute("id"));
			loadPlaylist(ID);

		});

	});

	let create = document.createElement("div");
	create.setAttribute("class", "playlist-create");
	
	let createImg = document.createElement("img");
	createImg.setAttribute("src", "/img/plus.png");
	create.appendChild(createImg);

	let createInputNameLabel = document.createElement("label")
	createInputNameLabel.innerText = "Playlist Name *";
	createInputNameLabel.setAttribute("for", "title");

	let createInputName = document.createElement("input");
	createInputName.setAttribute("name", "title");
	
	/*let createTitle = document.createElement("h1");
	createTitle.innerText = "Create New";
	create.appendChild(createTitle);*/

	create.addEventListener("click", (e) => {

		createPlaylist();

	});
		
	PlaylistsSection.appendChild(create);

	
	if(playlists.length === 0){
		loadDefaultImage();	
		return
	}else {
		//if(!isOnlyAudio && IMAGE.getAttribute("style")) IMAGE.removeAttribute("style");
	
		if(CurrentPlaylistID === undefined) loadPlaylist(0);

	};

	return;
};

function loadDefaultImage(){
	
	while(PlaylistSection.firstChild){
		PlaylistSection.removeChild(PlaylistSection.lastChild);
	};

	VIDEO.setAttribute("style", "display: none;");
	IMAGE.setAttribute("src", "/img/logo.png");	
	IMAGE.setAttribute("style", "display: block;");

	VideoSectionTitle.innerText = "UNITUBE";
	ProgressBar.value = 0;
	
	return;
}

function createPlaylist(){

	let create = document.querySelector(".playlist-create");	
	create.setAttribute("style", "display: none;");	

	let form = document.createElement("div");
	form.setAttribute("class", "playlist-form");
	
	let inputTitle = document.createElement("input");
	inputTitle.setAttribute("name", "title");
	inputTitle.setAttribute("type", "text");
	inputTitle.setAttribute("id", "playlist-form-title");
	inputTitle.setAttribute("placeholder", "Name");
	form.appendChild(inputTitle);

	let inputLink = document.createElement("input");
	inputLink.setAttribute("name", "url");
	inputLink.setAttribute("type", "text");
	inputLink.setAttribute("id", "playlist-form-link");
	inputLink.setAttribute("placeholder", "Url");
	inputLink.setAttribute("style", "display: none;");
	form.appendChild(inputLink);

	let select = document.createElement("select");
	select.setAttribute("name", "option");
	select.setAttribute("id", "playlist-form-select"); // img

	let createNewOption = document.createElement("option");
	createNewOption.innerText = "Create new";
	createNewOption.setAttribute("value", 1); // 1 - create
	select.appendChild(createNewOption);

	let importYtPlaylist = document.createElement("option")
	importYtPlaylist.innerText = "Import from youtube";
	importYtPlaylist.setAttribute("value", 2); // 2 - import yt
	select.appendChild(importYtPlaylist);

	form.appendChild(select);

	let formOptions = document.createElement("div");
	formOptions.setAttribute("class", "playlist-form-options");

	let buttonCreate = document.createElement("button");
	buttonCreate.innerText = "Create";
	buttonCreate.setAttribute("style", "margin-right: 1%;");
	formOptions.appendChild(buttonCreate);

	select.addEventListener("change", (e) => {
		let value = Number(select.value);

		switch(value){
			case 1: 
				inputLink.setAttribute("style", "display: none;");
				break;
			case 2: 
				inputLink.removeAttribute("style");
				break;

		};
		
		return;

	});

	buttonCreate.addEventListener("click", (e) => {

		if(isCreatingPlaylist){
			return;
		}else isCreatingPlaylist = true;
		
		(async () => {	

		let name = inputTitle.value;

		if(!name){
			alert("Undefined playlist name!");
			return;
		};

		let response = await new Promise((resolv, reject) => {

			fetch(API + "/lists/create?name=" + name)
				.then((res) => {
					res.json()
						.then((json) => {
							resolv(json);
						});
				});			

		});

		if(response.error){
			
			alert(response.error);

			isCreatingPlaylist = false;

		}else {

			let selectedOption = Number(select.value);

			if(selectedOption === 1){

				alert(response.msg);
				isCreatingPlaylist = false;
				loadPlaylists();	
			
			}else if(selectedOption === 2){

				let url = inputLink.value;
				let id = CurrentPlaylists.length;

				response = await new Promise((resolv, reject) => {

					fetch(API + "/lists/" + (id + 1) + "/import?url=" + url)
						.then((res) => {
							res.json()
								.then((json) => {
									resolv(json);
								});
						});			
		
				});

				if(response.error){
					alert(response.error);

					let id = CurrentPlaylists.length;

					console.log(id);

					response = await new Promise((resolv, reject) => {

						fetch(API + "/lists/" + (id + 1) + "/remove")
							.then((res) => {
								res.json()
									.then((json) => {
										resolv(json);
									});
							});			
			
					});

					if(response.error) alert(response.error);

					isCreatingPlaylist = false;
				
				}else {
					alert(response.msg);
					loadPlaylists();	
					isCreatingPlaylist = false;
				};

			}else {

				alert("List created!");
				isCreatingPlaylist = false;

			};
			
		};
		
		return;
		
		})();

	});

	let buttonCancel = document.createElement("button");
	buttonCancel.innerText = "Cancel";
	buttonCancel.setAttribute("style", "margin-left: 1%;");
	formOptions.appendChild(buttonCancel);	
	
	buttonCancel.addEventListener("click", () => {
	
		form.remove();
		create.removeAttribute("style");

	});

	form.appendChild(formOptions);

	PlaylistsSection.appendChild(form);

}

function checkItemScroll(item){
			
	let top = item.offsetTop;
	let bottom = (PlaylistSection.offsetHeight + PlaylistSection.scrollTop) - (item.offsetHeight * 3);

	//if(Number(item.getAttribute("id")) === 0) PlaylistSection.scrollTo(0, 0);
	if(bottom < top) PlaylistSection.scrollTo(0, top - (PlaylistSection.offsetHeight / 2));
	else if((PlaylistSection.scrollTop + (item.offsetHeight * 3)) > top) PlaylistSection.scrollTo(0, top - (PlaylistSection.offsetHeight / 4));;


	return;

}

async function loadPlaylist(id){

	if(id === undefined){
		return;
	}else if(id < 0){
		// somthing cool
		return;	
	};

	if(CurrentVideoID === undefined){
		loadDefaultImage();
	};


	/* Global functions */

	/* Init var */

	isSearching = false;
	isEditingPlaylist = false;

	/* try first */

	let songs = await new Promise((resolv, reject) => {

		fetch(API + "/lists/" + (id + 1))
			.then((res) => {
				res.json()
					.then((json) => {
						resolv(json);
					});
			});

	});

	console.log(songs);

	if(songs.error){
		alert(songs.error);
		return;
	};

	/* select playlist */	

	let playlists = PlaylistsSection.querySelectorAll(".playlist");
	
	if(CurrentPlaylistID !== undefined){
		if(playlists.length - 1 >= CurrentPlaylistID) playlists[CurrentPlaylistID].setAttribute("class", "playlist");
	};

	CurrentPlaylistID = id;

	playlists[id].setAttribute("class", "playlist playlist-active");
	//playlists[id].setAttribute("style", "background-color: #34495E; color: white;");

	while(PlaylistSection.firstChild){
		PlaylistSection.firstChild.remove();
	};

	let listInfo = document.createElement("div");
	listInfo.setAttribute("class", "list-info");

	let listDivTitle = document.createElement("div");
	listDivTitle.setAttribute("class", "list-title");
		
	let listSearch = document.createElement("input");
	listSearch.setAttribute("type", "text");
	listSearch.setAttribute("name", "search");
	listDivTitle.appendChild(listSearch);

	let listTitle = document.createElement("input");
	listTitle.value = CurrentPlaylists[id];
	listTitle.setAttribute("type", "text");
	listTitle.setAttribute("name", "title");
	listTitle.setAttribute("readonly", "true");
	listDivTitle.appendChild(listTitle);

	listInfo.appendChild(listDivTitle);

	let listOptions = document.createElement("div");
	listOptions.setAttribute("class", "list-options");

	let searchButton = document.createElement("img");
	searchButton.setAttribute("src", "/img/search.png");
	searchButton.setAttribute("id", "search-list");
	listOptions.appendChild(searchButton);
	
	let editButton = document.createElement("img");
	editButton.setAttribute("src", "/img/lapiz.png");
	editButton.setAttribute("id", "edit-list");
	listOptions.appendChild(editButton);

	
	let deleteButton = document.createElement("img");
	deleteButton.setAttribute("src", "/img/trash.png");
	deleteButton.setAttribute("id", "delete-list");
	listOptions.appendChild(deleteButton);

	listInfo.appendChild(listOptions);

	PlaylistSection.appendChild(listInfo); 

	searchButton.addEventListener("click", (e) => {

		if(editButton.getAttribute("id") === "edit-list"){
			
			editButton.setAttribute("id", "list-confirm");
			editButton.setAttribute("src", "/img/check.png");
			listTitle.setAttribute("style", "display: none;");
			listSearch.setAttribute("id", "list-input-active");
			listSearch.value = "";

			deleteButton.setAttribute("id", "list-cancel");		
			deleteButton.setAttribute("src", "/img/cancel.png");

			searchButton.setAttribute("style", "display: none;");

			isSearching = true;


		};

	});

	deleteButton.addEventListener("click", async (e) => {
	
		if(e.target.getAttribute("id") === "delete-list"){

			if(isDeletingPlaylist){
				return;
			}else isDeletingPlaylist = true;

			let response = await new Promise((resolv, reject) => {

				fetch(API + "/lists/" + (id + 1) + "/remove")
					.then((res) => {
						res.json()
							.then((json) => resolv(json));
					});			

			});
	
			isDeletingPlaylist = false;

			if(response.error){	
				alert(response.error);	
			}else {
				alert(response.msg);	
					
				if(CurrentVideoPlaylistID === id){
					removeVideo();
				};

				id = id - 1;

				if(CurrentPlaylists.length - 1 === 0) CurrentPlaylistID = undefined;
				else if(id < 0) id = CurrentPlaylists.length - 1;

				await loadPlaylists();
				await loadPlaylist(id);
	
			};

		}else {
			
			deleteButton.setAttribute("id", "delete-list");
			deleteButton.setAttribute("src", "/img/trash.png");

			listTitle.value = CurrentPlaylists[id];
			listTitle.removeAttribute("id");
			listTitle.setAttribute("readonly", "true");		
			listTitle.removeAttribute("style");
			listSearch.removeAttribute("id");
	
			editButton.setAttribute("id", "edit-list");
			editButton.setAttribute("src", "/img/lapiz.png");

			searchButton.removeAttribute("style");

			if(isSearching){

				let listItems = PlaylistSection.querySelectorAll(".list-item");

				listItems.forEach((item) => {

					if(item.hasAttribute("style")) item.removeAttribute("style");

				});

				checkItemScroll(CurrentPlayingPlaylistItems[CurrentVideoID]);

			};

			isSearching = false;
			isEditingPlaylist = false;

		}	

	});

	editButton.addEventListener("click", async (e) => {
		if(isEditingPlaylist) {
			
			listTitle.setAttribute("readonly", "true");
	
			let name = listTitle.value;

			if(name === CurrentPlaylists[id]){
				alert("It has the same name!");
				return;
			};

			let response = await new Promise((resolv, reject) => {

				fetch(API + "/lists/" + (id + 1) + "/change-name?name=" + name)
					.then((res) => {
						res.json()
							.then((json) => resolv(json));
					});			
			});
			
			isEditingPlaylist = false;

			if(response.error){	
				alert(response.error);
				listTitle.removeAttribute("readonly");
			}else {
				alert(response.msg);
				loadPlaylists();
		
				e.target.setAttribute("id", "edit-list");
				e.target.setAttribute("src", "/img/lapiz.png");
				listTitle.removeAttribute("id");

				deleteButton.setAttribute("id", "delete-list");		
				deleteButton.setAttribute("src", "/img/trash.png");

				searchButton.removeAttribute("style");
	
			};

			return;

		}else if(isSearching){

			let value = (listSearch.value).toLowerCase();
			let listItems = PlaylistSection.querySelectorAll(".list-item");

			listItems.forEach((item) => {

				let title = item.querySelector(".item-info h1").textContent;

				if(title.toLowerCase().indexOf(value) === -1){

					item.setAttribute("style", "display: none;");

				}else {

					if(item.hasAttribute("style")) item.removeAttribute("style");

				};

			});

			return;

		}else {

			e.target.setAttribute("id", "list-confirm");
			e.target.setAttribute("src", "/img/check.png");
			listTitle.setAttribute("id", "list-input-active");
			listTitle.removeAttribute("readonly");
	
			deleteButton.setAttribute("id", "list-cancel");		
			deleteButton.setAttribute("src", "/img/cancel.png");
	
			searchButton.setAttribute("style", "display: none;");
	
			isEditingPlaylist = true;

		};

	});

	/* songs */	

	let index = 0;

	songs.forEach((song) => {
		let item = document.createElement("div");	
		item.setAttribute("class", "list-item");
		item.setAttribute("id", index);
		item.setAttribute("link", song.url);
		
		let itemDivImg = document.createElement("div");
		itemDivImg.setAttribute("class", "item-image");
		
		let itemImg = document.createElement("img");
		itemImg.setAttribute("src", song.thumbnail);
		itemDivImg.appendChild(itemImg); 
		item.appendChild(itemDivImg);

		let itemDivInfo = document.createElement("div");
		itemDivInfo.setAttribute("class", "item-info");

		let itemTitle = document.createElement("h1");
		itemTitle.innerText = song.title;
		itemDivInfo.appendChild(itemTitle);	
		item.appendChild(itemDivInfo);	

		if(CurrentVideoPlaylistID === CurrentPlaylistID){

			if(index === CurrentVideoID){
				item.setAttribute("class", "list-item list-item-active");
				itemTitle.setAttribute("style", "color: white;");		
				CurrentVideoListItem = item;
			};

		};

		let itemOptions = document.createElement("div");
		itemOptions.setAttribute("class", "item-options");
			
		let itemMoveUp = document.createElement("img");
		itemMoveUp.setAttribute("src", "/img/up-arrow.png");
		itemMoveUp.setAttribute("class", "item-options-move-up");
		itemOptions.appendChild(itemMoveUp);

		let itemRemove = document.createElement("img");
		itemRemove.setAttribute("src", "/img/trash.png");
		itemRemove.setAttribute("class", "item-options-remove");
		itemOptions.appendChild(itemRemove);

		let itemMoveDown = document.createElement("img");
		itemMoveDown.setAttribute("src", "/img/down-arrow.png");
		itemMoveDown.setAttribute("class", "item-options-move-down");
		itemOptions.appendChild(itemMoveDown);

		item.appendChild(itemOptions);


		async function changePosition(pos, npos){

			if(isMovingItem){
				return;
			}else isMovingItem = true;

			let response = await new Promise((resolv, reject) => {
				fetch(API + "/lists/" + (CurrentPlaylistID + 1) + "/change-position?pos=" + pos + "&npos=" + npos)
					.then((res) => {
						res.json()
							.then((json) => resolv(json));
					});
			});

			if(response.error){
				alert(response.error);
			}else{
				alert(response.msg);
				let scroll = PlaylistSection.scrollTop;
				await loadPlaylist(CurrentPlaylistID);
				PlaylistSection.scrollTo(0, scroll);
			};

			isMovingItem = false;

			return;

		};
		
		itemMoveUp.addEventListener("click", (e) => {

			let id = Number(((e.target.parentNode).parentNode).getAttribute("id"));
			let pos = id + 1;
			let npos = pos - 1;

			if(npos === 0) npos = (PlaylistSection.querySelectorAll(".list-item")).length;

			changePosition(pos, npos);
			if(pos === (CurrentVideoID + 1)) CurrentVideoID--;
			else if(npos === (CurrentVideoID + 1)) CurrentVideoID++;

			return;

		});

		itemMoveDown.addEventListener("click", (e) => {

			let id = Number(((e.target.parentNode).parentNode).getAttribute("id"));
			let pos = id + 1;
			let npos = pos + 1;

			if(npos === (PlaylistSection.querySelectorAll(".list-item")).length + 1) npos = 1;

			changePosition(pos, npos);
			if(pos === (CurrentVideoID + 1)) CurrentVideoID++;
			else if(npos === (CurrentVideoID + 1)) CurrentVideoID--;

			return;

		});

		itemRemove.addEventListener("click", async (e) => {

			e.preventDefault();
			
			let id = Number((e.target.parentNode).parentNode.getAttribute("id"));
			
			console.log(API + "/lists/" + (CurrentPlaylistID + 1) + "/remove-item?id=" + (id + 1));

			let response = await new Promise((resolv, reject) => {
				fetch(API + "/lists/" + (CurrentPlaylistID + 1) + "/remove-item?id=" + (id + 1))
					.then((res) => {
						res.json()
							.then((json) => resolv(json));
					});
			});

			if(response.error){
				alert(response.error);
				return;
			}else{
				alert(response.msg);
				let scroll = PlaylistSection.scrollTop;
				await loadPlaylist(CurrentPlaylistID);
				PlaylistSection.scrollTo(0, scroll);
				return;
			};

		});
		
		item.addEventListener("click", (e) => {
	
			if((e.target.parentNode) ? e.target.parentNode.getAttribute("class") === "item-options" : false || e.target.getAttribute("class") === "item-options"){
				return;
			};
	
			if(CurrentVideoListItem){
				CurrentVideoListItem.setAttribute("class", "list-item");			
				CurrentVideoListItem.querySelector("h1").removeAttribute("style");
			};

			let ITEM = item;

			ITEM.setAttribute("class", "list-item list-item-active");
			ITEM.querySelector("h1").setAttribute("style", "color: white;");


			if(ITEM.parentNode !== null) CurrentVideoPlaylistID = CurrentPlaylistID;

			if(CurrentVideoPlaylistID === CurrentPlaylistID){
				//alert(CurrentVideoPlaylistID + " " + CurrentPlaylistID);
				checkItemScroll(ITEM);
				CurrentPlayingPlaylistItems = PlaylistSection.querySelectorAll(".list-item");
			};

			lastItemClickedID = Number(ITEM.getAttribute("id"));
			lastItemClickedPlaylistID = CurrentVideoPlaylistID; 
			lastItemClickedPlaylist = CurrentPlayingPlaylistItems;

			CurrentVideoListItem = ITEM;

			let title = song.title;
			VideoSectionTitle.innerText = title;			

			if(isLoadingVideo){
				return;
			};

			let url = song.url;
			let image = song.thumbnail_max_resolution;

			CurrentVideoID = Number(ITEM.getAttribute("id"));			
			
			console.log(ITEM);
			
			IMAGE.setAttribute("src", image);			

			//CurrentPlayingPlaylistID 
			//alert(ITEM.parentNode)

			loadVideo(url);

		});
			
		PlaylistSection.appendChild(item);
		
		index++;	

	});
	

	let addItemButton = document.createElement("div");
	addItemButton.setAttribute("class", "add-item-button");

	let addItemButtonImg = document.createElement("img");
	addItemButtonImg.setAttribute("src", "/img/plus.png");
	addItemButton.appendChild(addItemButtonImg);
	PlaylistSection.appendChild(addItemButton);

	/*  */

	let addItemForm = document.createElement("div");
	addItemForm.setAttribute("class", "add-item-form");

	let addItemLink = document.createElement("input");
	addItemLink.setAttribute("type", "text");
	addItemLink.setAttribute("name", "url");
	addItemLink.setAttribute("placeholder", "Youtube video url");
	addItemForm.appendChild(addItemLink);

	let addItemOptions = document.createElement("div");
	addItemOptions.setAttribute("class", "add-item-form-options");
	
	let addItemSubmit = document.createElement("button");
	addItemSubmit.setAttribute("id", "add-item-form-submit");
	addItemSubmit.innerText = "Add";
	addItemOptions.appendChild(addItemSubmit);

	let addItemCancel = document.createElement("button");
	addItemCancel.setAttribute("id", "add-item-form-cancel");
	addItemCancel.innerText = "Cancel";
	addItemOptions.appendChild(addItemCancel);
	addItemForm.appendChild(addItemOptions);
	PlaylistSection.appendChild(addItemForm);
	

	addItemButton.addEventListener("click", (e) => {

		addItemButton.setAttribute("style", "display: none;");	
		addItemForm.setAttribute("style", "display: block;");
		PlaylistSection.scrollTo(0, PlaylistSection.scrollHeight);

	});

	addItemCancel.addEventListener("click", (e) => {
	
		addItemButton.setAttribute("style", "display: block;");
		addItemForm.setAttribute("style", "display: none;");
		
	});

	addItemSubmit.addEventListener("click", async (e) => {
			
		if(isAddingVideo){
			return;
		}else isAddingVideo = true;
	
		let url = addItemLink.value;

		if(!url){
			alert("Undefined url!");	
			return;
		};

		let response = await new Promise((resolv, reject) => {
			
			fetch(API + "/lists/" + (id + 1) + "/add?url=" + url)
				.then((res) => {
					res.json()
						.then((json) => resolv(json));
				});

		});	

		console.log(response);
		
		if(response.error){
			alert(response.error);
		}else {
			alert(response.msg);
			await loadPlaylist(id);	
			PlaylistSection.scrollTo(0, PlaylistSection.scrollHeight);
		};

		isAddingVideo = false;	
	
		return;
	
	});

	if(CurrentVideoPlaylistID === CurrentPlaylistID){
		//alert(CurrentVideoPlaylistID + " " + CurrentPlaylistID);
		CurrentPlayingPlaylistItems = PlaylistSection.querySelectorAll(".list-item");
		checkItemScroll(CurrentPlayingPlaylistItems[CurrentVideoID]);

	}else PlaylistSection.scrollTo(0, 0);

	return;
}


async function loadVideo(url){

	if(isLoadingVideo){
		return;
	}else if(!url){
		return;
	}else if(!isOnlyAudio && IMAGE.getAttribute("style")){
		IMAGE.removeAttribute("style");
		VIDEO.removeAttribute("style");
	}

	isLoadingVideo = true;

	let adaptiveFormats = await new Promise((resolv, reject) => {

		fetch(API + "/download/all?url=" + url)
			.then((res) => {
			
				res.json()
					.then((json) => {
						resolv(json);
					});
			});
	});

	
	/*if(CurrentVideoPlaylistID === CurrentPlaylistID){
		//alert(CurrentVideoPlaylistID + " " + CurrentPlaylistID);
		CurrentPlayingPlaylistItems = PlaylistSection.querySelectorAll(".list-item");
	};*/

	CurrentVideoAvailableQualities = { video : {}, audio : {} };

	//if(CurrentVideoPlaylistID !== CurrentVideoPlaylist);

	//let videoAvailableQualities;

	adaptiveFormats.forEach((format) => {

		format["type"] = format.mimeType;

		let quality;
		let type;
	
		if(format.qualityLabel){
			quality = format.qualityLabel;
			type = "video";
		}else if(format.audioQuality){
			quality = format.audioQuality;
			type = "audio";
		};

		if(!CurrentVideoAvailableQualities[type][quality])
			CurrentVideoAvailableQualities[type][quality] = [format];
		else
			CurrentVideoAvailableQualities[type][quality].push(format);
		
	});

	
	function checkVideoQualitys(){

		Object.keys(CurrentVideoAvailableQualities.video).forEach((quality) => {

			let isAllNull = true;
			let sources = CurrentVideoAvailableQualities.video[quality];

			for(let i = 0; i < sources.length; i++){

				if(!sources[i].contentLength === false) isAllNull = false;
				else {

					sources.splice(i, i + 1);

				};

			};

			if(isAllNull) delete CurrentVideoAvailableQualities.video[quality];

		});

		return;
	};

	checkVideoQualitys();

	let VideoQuality = "720p";

	if(Object.keys(CurrentVideoAvailableQualities.video).length === 0){

		alert("Video can't not be loaded, then the video can not be played!");
		return;

	}else if(!CurrentVideoAvailableQualities.video[VideoQuality]){
		
		let VideoQualitys = Object.keys(CurrentVideoAvailableQualities.video);
		VideoQuality = VideoQualitys[0];

	};

	CurrentVideoQuality = VideoQuality;
	
	function checkAudioQualitys(){

		Object.keys(CurrentVideoAvailableQualities.audio).forEach((quality) => {

			let isAllNull = true;
			let sources = CurrentVideoAvailableQualities.audio[quality];

			for(let i = 0; i < sources.length; i++){

				if(!sources[i].contentLength === false) isAllNull = false;
				else {

					sources.splice(i, i + 1);

				};

			};

			if(isAllNull) delete CurrentVideoAvailableQualities.audio[quality];

		});

		return;
	};

	checkAudioQualitys();

	let AudioQuality = "AUDIO_QUALITY_MEDIUM";

	CurrentAudioQuality = AudioQuality;

	if(Object.keys(CurrentVideoAvailableQualities.audio).length === 0){

		alert("Audio can't not be loaded, then the video can not be played!");
		return;

	}else if(!CurrentVideoAvailableQualities.audio[AudioQuality]){

		let AudioQualitys = Object.keys(CurrentVideoAvailableQualities.audio);
		AudioQuality = AudioQualitys[0];

	};

	console.log(CurrentVideoAvailableQualities);
	
	if(adaptiveFormats.error){
		alert(info.error);
		return;
	};

	PlayPauseButton.setAttribute("src", "/img/pause-button.png");	
	
	let duration; // seconds

	// remove video sources 

	while(VIDEO.firstChild){
  		VIDEO.removeChild(VIDEO.lastChild);
	};

	while(AUDIO.firstChild){
  		AUDIO.removeChild(AUDIO.lastChild);
	};

	CurrentVideoAvailableQualities.video[VideoQuality].forEach((format) => {

		let source = document.createElement("source");
		source.setAttribute("src", format.url);
		source.setAttribute("type", format.type);
		VIDEO.appendChild(source);

		if(!duration) duration = Number(format.approxDurationMs) / 1000; // ms a s

		/*if(info.video){
			VIDEO.setAttribute("src", info.video.url);	
			VIDEO.setAttribute("type", info.video.type);
			duration = Number(info.video.approxDurationMs) / 1000; // ms a s
		};

		if(info.audio){
			AUDIO.setAttribute("src", info.audio.url);
			AUDIO.setAttribute("type", info.audio.type);
			if(!duration) duration = Number(info.audio.approxDurationMs) / 1000;
		};*/

	});

	CurrentVideoAvailableQualities.audio[AudioQuality].forEach((format) => { 

		let source = document.createElement("source");
		source.setAttribute("src", format.url);
		source.setAttribute("type", format.type);
		AUDIO.appendChild(source);

		if(!duration) duration = Number(format.approxDurationMs) / 1000;
	
	});

	if(!isOnlyAudio){
		VIDEO.load();
	}else {
		VIDEO.setAttribute("style", "display: none;");
		IMAGE.setAttribute("style", "display: block;");						
	
		CurrentVideoSourcesFragemnt = document.createDocumentFragment();
	
		while(VIDEO.firstChild) CurrentVideoSourcesFragemnt.appendChild(VIDEO.firstChild);
	};

	AUDIO.load();

	VideoStatus = 1;
	CurrentVideoDuration = Math.floor(Number(duration.toFixed(1)));

	/*
	
	Some videos will throw 503 error and this function will check if there is any bad response status
	in the video url. Is there a fast option to check if the video will throw 503 error, we only need
	to check if the content length of the video is null
	
	let checkedQualitys = [];

	function checkVideo(e){

		isLoadingVideo = false
			
		let videoHasAnyError = true; 
		let checkedSources = 0;
	
		for(let i = 0; i < VIDEO.childNodes.length; i++){
			fetch(VIDEO.childNodes[i].src)
				.then((res) => {
					alert(res.status);
					checkedSources++;
					if(res.status === 200) videoHasAnyError = false;
					if(checkedSources === VIDEO.childNodes.length){
						if(videoHasAnyError) loadNewQuality();
					};
				});
		};
	
		function loadNewQuality(){

			checkedQualitys.push(CurrentVideoQuality);

			while(VIDEO.firstChild){
				VIDEO.removeChild(VIDEO.lastChild);
			};	

			let availableQualities = Object.keys(CurrentVideoAvailableQualities);
			let newQualityIndex = availableQualities.indexOf(CurrentVideoQuality) + 1;
			if(checkedQualitys.length === availableQualities.length){

				alert("Video can not be loaded!");
				forwardVideo();
				return;

			}else if(newQualityIndex >= availableQualities.length){
					
				newQualityIndex = 0;

			}else {

				CurrentVideoQuality = availableQualities[newQualityIndex];
				let newQualitySources = CurrentVideoAvailableQualities.video[CurrentVideoQuality];

				for(let i = 0; i < newQualitySources.length; i++){
					let source = document.createElement("source");
					source.setAttribute("src", newQualitySources[i].url);
					source.setAttribute("type", newQualitySources[i].mimeType);
					VIDEO.appendChild(source);					
				};

				VIDEO.load();
				VIDEO.addEventListener("load", checkVideo, { once: true });

			};
		};
	
	};

	VIDEO.addEventListener("loadstart", checkVideo, { once: true });*/

	checkLastItemClicked();

	isVideoLoaded = false;
	isAudioLoaded = false;
	
	VIDEO.removeEventListener("loadedmetadata", checkVideoLoaded);			
	AUDIO.removeEventListener("loadedmetadata", checkAudioLoaded);	

	VIDEO.addEventListener("loadedmetadata", checkVideoLoaded, { once: true });			
	AUDIO.addEventListener("loadedmetadata", checkAudioLoaded, { once: true });			

	//AUDIO.addEventListener("loadedmetadata", startVideoHandler, { once: true });

	/* hide video config */

	closeVideoConfig();
	
}

function checkVideoLoaded(e){

	isVideoLoaded = true;

	if(isVideoLoaded && isAudioLoaded) startVideoHandler();

	return;
};

function checkAudioLoaded(e){

	isAudioLoaded = true;

	if(isAudioLoaded && isVideoLoaded) startVideoHandler();
	else if(isOnlyAudio && isAudioLoaded) startVideoHandler();

	return;

}

function checkLastItemClicked(e){

	isLoadingVideo = false;

	if(lastItemClickedID !== CurrentVideoID || lastItemClickedPlaylistID !== CurrentVideoPlaylistID){
		VIDEO.removeAttribute("loadedmetadata", startVideoHandler);
		lastItemClickedPlaylist[lastItemClickedID].click();
	};

	return;

}


function startVideoHandler(){

	/* */

	if(VideoHandlerInterval){
		//pauseVideo();
		clearInterval(VideoHandlerInterval);
	};

	CurrentVideoTime = 0;

	ProgressBar.setAttribute("value", MIN_PROGRESS);
	
	//let NetworkErrorCount = 0;
	let wait = 2;
	let needWait = true;

	function isBuffering(){

		let isBufferingVideo = true;
		let isBufferingAudio = true;
	
		/*for(let i = 0; i < VIDEO.buffered.length; i++){
			if(VIDEO.buffered.start(i) <= VIDEO.currentTime && VIDEO.buffered.end(i) >= VIDEO.currentTime) isBufferingVideo = false;
		};	
		
		for(let i = 0; i < AUDIO.buffered.length; i++){i
			if(AUDIO.buffered.start(i) <= AUDIO.currentTime && AUDIO.buffered.end(i) >= AUDIO.currentTime) isBufferingAudio = false;
		};

		if(isOnlyAudio && !isBufferingAudio){
			return false;
		}else if(isBufferingAudio || isBufferingVideo){
			return true;
		}else {
			return false;
		};*/

		if(needWait){

			if(!isOnlyAudio && !isVideoInBackground){

				for(let i = 0; i < VIDEO.buffered.length; i++){
					if(VIDEO.buffered.start(i) <= wait && VIDEO.buffered.end(i) >= wait) isBufferingVideo = false;
				};
			
			}else isBufferingVideo = false;

			for(let i = 0; i < AUDIO.buffered.length; i++){i
				if(AUDIO.buffered.start(i) <= wait && AUDIO.buffered.end(i) >= wait) isBufferingAudio = false;
			};

		}else {

			if(!isOnlyAudio && !isVideoInBackground){

				for(let i = 0; i < VIDEO.buffered.length; i++){
					if(VIDEO.buffered.start(i) <= VIDEO.currentTime && VIDEO.buffered.end(i) >= VIDEO.currentTime) isBufferingVideo = false;
				};	

			}else isBufferingVideo = false;
			
			for(let i = 0; i < AUDIO.buffered.length; i++){i
				if(AUDIO.buffered.start(i) <= AUDIO.currentTime && AUDIO.buffered.end(i) >= AUDIO.currentTime) isBufferingAudio = false;
			};

		};

		if(isOnlyAudio && !isBufferingAudio){
			if(needWait) needWait = false;
			return false;
		}else if(isBufferingAudio || isBufferingVideo){
			return true;
		}else {
			if(needWait) needWait = false;
			return false;
		};

	};

	playVideo();
	
	VideoHandlerInterval = setInterval(() => {
		
		console.log("State: v: " + VIDEO.readyState + " a: " + VIDEO.networkState);
		
		if(VideoStatus === 1){
			
			if(!isBuffering() && VIDEO.readyState !== 2 && AUDIO.readyState !== 2){

				console.log("status: ", VIDEO.readyState);

				if(!isVideoInBackground && !isOnlyAudio){
					
					if(((VIDEO.currentTime - AUDIO.currentTime) + 1) < 0 || ((AUDIO.currentTime - VIDEO.currentTime) + 1) < 0){
						VIDEO.currentTime = AUDIO.currentTime;
					};

					if(VIDEO.paused || AUDIO.paused) playVideo();
				}else if((isOnlyAudio || isVideoInBackground) && AUDIO.paused) playVideo();
	
				// update progress bar

				if(isVideoInBackground) VIDEO.currentTime = AUDIO.currentTime;

				CurrentVideoTime = Number((CurrentVideoTime + 0.1).toFixed(1));
				ProgressBar.setAttribute("value", Math.floor((CurrentVideoTime * MAX_PROGRESS) / CurrentVideoDuration));	
				console.log(CurrentVideoTime, VIDEO.currentTime, AUDIO.currentTime);
	
			}else{

				/*if(VIDEO.networkState === 0){ // do it with audio?

					if(NetworkErrorCount === 14){
						
					};

					NetworkErrorCount++;

				};*/

				if(!needWait){

					wait = CurrentVideoTime + 2;
					
					if(wait < CurrentVideoDuration)	needWait = true; // Problems on video end in buffering
	
				};

				(async () => {
					await VIDEO.pause();
					await AUDIO.pause();
				})();

			};
	
			// check if video finished
			
			if(CurrentVideoTime >= CurrentVideoDuration){

				console.log(CurrentVideoTime, CurrentVideoDuration, CurrentVideoID);

				pauseVideo();	
				forwardVideo();		
				clearInterval(VideoHandlerInterval);	

			};
			
	
		};

	}, 100);

}

function loadProgressBar(){

	ProgressBar.addEventListener("click", (e) => {
		
		if(!CurrentVideoDuration || !CurrentVideoTime){
			//alert("Error undefined video duration!");	
			return;
		};

		if(!AUDIO.paused || !VIDEO.paused){ 
			AUDIO.pause();
			VIDEO.pause(); 
			// do not change VideoStatus
		};

		CurrentVideoTime = (e.offsetX / ProgressBar.offsetWidth) * CurrentVideoDuration; 
			// f(position click event, relative to progress with / 100) * width progress bar
		ProgressBar.value = Math.floor((CurrentVideoTime * MAX_PROGRESS) / CurrentVideoDuration);
		
		console.log(CurrentVideoTime);
		
		AUDIO.currentTime = CurrentVideoTime; 
  		VIDEO.currentTime = AUDIO.currentTime;
	
		if(VideoStatus === 1) playVideo();

		/*
		if(VideoStatus === 1){
			AUDIO.play();
			VIDEO.play();
		};*/
				
	});

	return;

}

function loadVolume(){

	let MIN = 0;
	let MAX = 100;

	VolumeProgressBar.addEventListener("click", (e) => { 
		let volume = Number((e.offsetX / VolumeProgressBar.offsetWidth).toFixed(1));

		if(volume === 0){
			VolumeButton.setAttribute("src", "/img/volume-mute.png");
			isVideoMuted = true;
			CurrentVideoVolume = AUDIO.volume;
			
		}else if(volume > 0 && isVideoMuted){
			VolumeButton.setAttribute("src", "/img/volume.png");
			isVideoMuted = false;	
		};
 
		VolumeProgressBar.setAttribute("value", volume * 100);
		console.log(volume);	
		//volume = volume / 100; // 0.4, 0.5, 0.6,...

		AUDIO.volume = volume;
		VIDEO.volume = volume; 
	});


	return;
}

function rewindVideo(){

	if(CurrentVideoID === undefined){
		return;
	};

	let songs = CurrentPlayingPlaylistItems;
	let id = (lastItemClickedID !== CurrentVideoID) ? lastItemClickedID : CurrentVideoID;
	id--;
	let item = songs[id];

	/*
	for(let i = 0; i < songs.length; i++){

		let id = Number(songs[i].getAttribute("id"));
		if(id === (CurrentVideoID - 1)){
			item = songs[i];	
			break;
		};

	};*/
	
	console.log("Rewind item: ", item);

	if(item) item.click();
	else songs[songs.length - 1].click();
	
	return;

}
var z = 0; 
function forwardVideo(){

	if(CurrentVideoID === undefined){
		return;
	};

	let songs = CurrentPlayingPlaylistItems;
	let id = (lastItemClickedID !== CurrentVideoID) ? lastItemClickedID : CurrentVideoID;
	id++;
	let item = songs[id];

	/*
	for(let i = 0; i < songs.length; i++){

		let id = Number(songs[i].getAttribute("id"));
		if(id === (CurrentVideoID + 1)){
			item = songs[i];	
			break;
		};

	};*/
	
	//console.log(item, songs[0].getAttribute("id"), CurrentVideoID);
	console.log("x: " + isLoadingVideo, z++);

	if(item) item.click();
	else songs[0].click();	

	return;

};

function loadVideoConfig(){

	closeVideoConfig();

	VideoConfigButton.addEventListener("click", (e) => {
		
		if(isVideoConfigOpen){

			closeVideoConfig();
		
		}else {

			openVideoConfig();
	
			let availableQualities = Object.keys(CurrentVideoAvailableQualities.video);

			while(VideoConfigQuality.firstChild){
				VideoConfigQuality.removeChild(VideoConfigQuality.lastChild);
			};	

			availableQualities.forEach((quality) => {
			
				let option = document.createElement("option");
				option.innerText = quality;
				option.setAttribute("value", quality);		
	
				VideoConfigQuality.appendChild(option);
				
			});

			VideoConfigQuality.value = CurrentVideoQuality;

		};

	});


	VideoConfigQuality.addEventListener("change", (e) => {
	
		if(isOnlyAudio){
			alert("Can't change quality, is playing only audio!");
			return;		
		};

		pauseVideo();

		let quality = VideoConfigQuality.value;
		CurrentVideoQuality = quality;
		let formats = CurrentVideoAvailableQualities.video[quality];

		while(VIDEO.firstChild){
			VIDEO.removeChild(VIDEO.lastChild);
		};

		formats.forEach((format) => {

			let source = document.createElement("source");
			source.setAttribute("src", format.url);

			VIDEO.appendChild(source);

		});

		VIDEO.load();

		VIDEO.addEventListener("loadedmetadata", () => {
			
			VIDEO.currentTime = AUDIO.currentTime; 
			VideoStatus = 1;

		}, { once: true });

	});	


	VideoConfigOnlyAudio.addEventListener("change", (e) => {
	
		if(VideoConfigOnlyAudio.checked){

			VIDEO.pause();		
		
			isOnlyAudio = true;

			CurrentVideoSourcesFragemnt = document.createDocumentFragment();
	
			while(VIDEO.firstChild){

				CurrentVideoSourcesFragemnt.appendChild(VIDEO.firstChild);	
				//VIDEO.removeChild(VIDEO.lastChild);

			};	
	
			IMAGE.setAttribute("style", "display: block;");
			VIDEO.setAttribute("style", "display: none;");
			VIDEO.load();

			if(VideoStatus === 1) playVideo();
		
			/* disable quality */

			VideoConfigQuality.setAttribute("disabled", "true");

		}else {
		
			AUDIO.pause();

			isOnlyAudio = false;
		
			VIDEO.appendChild(CurrentVideoSourcesFragemnt);
			VIDEO.load();		
		
			VIDEO.pause();
			VIDEO.currentTime = AUDIO.currentTime;
			VIDEO.setAttribute("style", "display: block;");
			IMAGE.setAttribute("style", "display: none;");

			if(VideoStatus === 1) playVideo();	

			/* enable quality */

			VideoConfigQuality.removeAttribute("disabled");

		}
	
	});

	VideoConfigDownload.addEventListener("click", (e) => {

		if(CurrentVideoID === undefined || isDownloading){
			return;
		};

		isDownloading = true;

		let request = API + "/download/download";
		let ytUrl = CurrentPlayingPlaylistItems[CurrentVideoID].getAttribute("link");
		let audioQuality = (() => {

			let quality;

			switch(CurrentAudioQuality){
				case 'AUDIO_QUALITY_HIGH': 
					quality = 'high';
					break;
				case 'AUDIO_QUALITY_MEDIUM':
					quality = 'medium';
					break;
				case 'AUDIO_QUALITY_LOW':
					quality = 'low';
					break;
				default:
					quality = 'medium';
					break;
			};

			return quality;

		})();

		let options;
		
		if(isOnlyAudio) options = JSON.stringify({
			audio : {
				quality : audioQuality
			}
		});
		else options = JSON.stringify({
			audio : {
				quality : audioQuality
			},
			video : {
				quality : Number(CurrentVideoQuality.slice(0, CurrentVideoQuality.length -  1))
			}
		});

		let downloadText = 	VideoConfigDownload.querySelector("h1");
		let count = 0;
		downloadText.innerText = "Downloading";
		let downloadInterval = setInterval(() => {

			if(count === 3){
				downloadText.innerText = "Downloading";
				count = 0;
			}

			downloadText.innerText += " .";
			count++;

		}, 500);

		fetch(request, {
			
			method: 'POST',
			headers : {
				'Content-Type': 'application/x-www-form-urlencoded'
			},
			body : "url=" + ytUrl + "&options=" + options

		}).then(async (res) => {

			clearInterval(downloadInterval);
			isDownloading = false;
			downloadText.innerText = "Download";

			if(res.status === 200){

				let reader = res.body.getReader();
				let chunks = [];
				
				let done, value;
				while (!done) {
					({ value, done } = await reader.read());
					chunks.push(value);
				};

				let blob = new Blob(chunks, { type: (isOnlyAudio) ? 'audio/mp4' : 'video/mp4'});
				let blobUrl = URL.createObjectURL(blob);
				let a = document.createElement("a");
				a.download = (isOnlyAudio) ? 'output.mp3' : 'output.mp4';
				a.href = blobUrl;
				a.click();
				URL.revokeObjectURL(blob);
			
			}else { 
				
				res.json()
					.then((json) => {
						alert("Error: " + json.error)
						console.log(json);
					});

			};

		});

	});

	
	return;

}


/*function loadVideoEvents(){
	
	VIDEO.addEventListener("ended", () => {

		alert();
		pauseVideo();
		forwardVideo();
		
	});

	return;
};*/

function loadStatic(){

	isVideoInBackground = false;

	/* On change visibility play the video, requireed because saving batery funcionality of browsers */

	function checkDocumentVisibility(e){
	
		if(isVideoInBackground) isVideoInBackground = false;
		else isVideoInBackground = true;

		if(VideoStatus === 1 && !isVideoInBackground) playVideo();

		//alert(isVideoInBackground);

		return;

	};

	document.addEventListener("visibilitychange", checkDocumentVisibility);

	changeColor.addEventListener("change", async (e) => {

		if(isChangingColor){
			return;
		}else isChangingColor = true;

		let color = changeColor.value;

		let response = await new Promise((resolv, reject) => {

			fetch(API + "/app/change-background-color?color=" + encodeURIComponent(color))
				.then((res) => {
					res.json()
						.then((json) => {
							resolv(json);
						});
				});			

		});

		document.body.setAttribute("style", "background-color: " + color);

		if(response.error) alert(response.error);
		else alert(response.msg);

		isChangingColor = false;

		return;

	});

};

async function loadDefault(){

	/* Background Color */

	let response = await new Promise((resolv, reject) => {

		fetch(API + "/app/get-background-color")
			.then((res) => {
				res.json()
					.then((json) => {
						resolv(json);
					});
			});			

	});

	let color = decodeURIComponent(response.color);

	document.body.setAttribute("style", "background-color: " + color);
	changeColor.value = color;

};

/* default listeners */
window.addEventListener('load', async (e) => {
	loadVideoBar();
	await loadPlaylists()
	loadVolume();
	loadProgressBar();
	//loadVideoEvents();
	loadVideoConfig();
	loadStatic();
	loadDefault();


}, { once : true })
/*
	loadVideoBar();
	await loadPlaylists()
	loadVolume();
	loadProgressBar();
	//loadVideoEvents();
	loadVideoConfig();
})();*/
