const path = __dirname;
const fs = require("fs");
const configPath = path + "/app/config.json";
const config = {
    path : path
};
const os = require("os");
const cp = require("child_process");
let platform = os.platform();
let arch = process.arch;
let cmd = process.argv[0] + " " + path + "/node_modules/electron-packager/bin/electron-packager.js " + path + "/app" + " UniTube --plataform=" + platform + " --arch=" + arch + " --icon=" + path + "/app/icon.ico";

console.log("Saving app path...");

fs.writeFileSync(configPath, JSON.stringify(config));

console.log("Building app...\n" + cmd);

cp.exec(cmd, (err, stdout, stderr) => {

    if(err) throw err;
    else if(stderr) console.log(stderr);

    console.log("App build sucessfully ended...");

    fs.rmSync(path + "/bin", { recursive: true, force: true });
    //fs.mkdirSync(path + "/bin");
    
    let name = "UniTube-" + platform + "-" + arch;
    let oldPath = path + "/" + name;
    let newPath = path + "/bin";

    fs.renameSync(oldPath, newPath);

    console.log("Creating desktop link...");

    let desktopPath = os.homedir() + "/Desktop";

    fs.symlinkSync(newPath + "/UniTube.exe", desktopPath + "/UniTube");

    console.log("Done!");

});