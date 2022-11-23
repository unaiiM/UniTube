const path = __dirname;
const express = require("express");
const app = express();
const PORT = 80;

app.use(express.static(path + "/public"));

app.route("/")
	.get((req, res) => {
		res.sendFile(path + "/src/index.html");
	});


app.listen(PORT, () => console.log("Server started on port " + PORT))
