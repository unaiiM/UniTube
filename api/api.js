const path = __dirname;
const express = require("express");
const app = express();
const downloadRouter = require(path + "/routers/download");
const listsRouter = require(path + "/routers/lists");
const appRouter = require(path  + "/routers/app");
const PORT = 4444;

app.use((req, res, next) => {
	res.append("Access-Control-Allow-Origin", "*");
	next();
});
app.use("/download", downloadRouter);
app.use("/lists", listsRouter);
app.use("/app", appRouter);

app.listen(PORT, () => console.log("API server started on port " + PORT));
