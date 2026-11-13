import { Config } from "@remotion/cli/config";

Config.setVideoImageFormat("jpeg");
Config.setJpegQuality(95);
Config.setCodec("h264");
Config.setCrf(20);
Config.setOverwriteOutput(true);
// Port 3000 is taken by the bot's own server.
// Render server port is picked automatically (a fixed port fails if a previous render is still shutting down).
Config.setStudioPort(3231);
// Use the Edge that ships with Windows instead of downloading a separate headless Chrome.
const EDGE = "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";
if (process.platform === "win32" && require("node:fs").existsSync(EDGE)) Config.setBrowserExecutable(EDGE);
