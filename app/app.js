const config = require("./config.json");
const path = config.path;
const electron = require("electron");
const app = electron.app;
const BrowserWindow = electron.BrowserWindow;
const cp = require("child_process");
const fs = require("fs");

const LOG_FILE = path + "/log/log.txt";

var WEB_PROCESS = startWebServer();
var API_PROCESS = startApiServer();

fs.writeFileSync(LOG_FILE, "");


function startWebServer(){

    let ps = cp.spawn("node", [path + "/web/serv.js"]);
    let str = "[Log WEB]\n\t[Process Info] PID " + ps.pid + "\n";

    ps.stderr.on("data", (stderr) => {

        str += "\t[Stderr]\n " + stderr.toString() + "\n[End Stderr]\n";

    });

    ps.stdout.on("data", (stdout) => {

        str += "\t[Stdout]\n " + stdout.toString() + "\n[End Stdout]\n";       

    });

    ps.on("error", (err) => {

        console.log(err);
        str += "\t[Error] " + err + "\n";

    });

    ps.on("close", (code) => {

        str += "\t[END] Process END Code " + code + "\n[END Log WEB]\n";

        fs.appendFileSync(LOG_FILE, str);

    });

    return ps;

};

function startApiServer(){

    let ps = cp.spawn("node", [path + "/api/api.js"]);
    let str = "[Log API]\n\t[Process Info] PID " + ps.pid + "\n";

    ps.stderr.on("data", (stderr) => {

        str += "\t[Stderr]\n " + stderr.toString() + "\n[End Stderr]\n";

    });

    ps.stdout.on("data", (stdout) => {

        str += "\t[Stdout]\n " + stdout.toString() + "\n[End Stdout]\n";       

    });

    ps.on("error", (err) => {

        console.log(err);
        str += "\t[Error] " + err + "\n";

    });

    ps.on("close", (code) => {

        console.log(code);
        str += "\t[END] Process END Code " + code + "\n[END Log API]\n";

        fs.appendFileSync(LOG_FILE, str);

    });

    return ps;

};

function removeTmpFiles(){

    let tmpPath = path + "/api/tmp";
    let files = fs.readdirSync(tmpPath);

    files.forEach((file) => {

        let err = fs.unlinkSync(tmpPath + "/" + file);

    });

};

app.on("ready", () => {

    let window = new BrowserWindow({
        show : false,
        icon : path + "/app/icon.png"
    });
    window.setMenu(null);
    window.loadURL("http://127.0.0.1:80");
    window.maximize();

    window.on("close", () => {

        WEB_PROCESS.kill();
        API_PROCESS.kill();

        removeTmpFiles();

    });

});