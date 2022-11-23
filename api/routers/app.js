const path = __dirname;
const fs = require("fs");
const express = require("express");
const { app } = require("electron");
const router = new express.Router();
const dbPath = path + "/../db/app.json";
const db = require(path + "/../db/app.json");

function updateDatabase(){

	try {
		fs.writeFileSync(dbPath, JSON.stringify(db));
	} catch(err){
		return err;
	};

	return;

};

router.route("/change-background-color")
    .get((req, res) => {

        let color = decodeURIComponent(req.query.color);

        if(!color){
            res.status(500).json({ error : "Undefined color!" });
        }else {

            db["background-color"] = color;
            
            let err = updateDatabase();

            if(err) res.status(500).json({ error : err });
            else res.status(200).json({ msg : "Color changed sucessfully!" });

        };

    });

router.route("/get-background-color")
    .get((req, res) => {

        res.status(200).json({ color : db["background-color"] });

    });

module.exports = router;
