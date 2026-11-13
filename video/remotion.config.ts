import { Config } from "@remotion/cli/config";

Config.setVideoImageFormat("jpeg");
Config.setJpegQuality(95);
Config.setCodec("h264");
Config.setCrf(16);
Config.setOverwriteOutput(true);
// Port 3000 is taken by the bot's own server.
Config.setPort(3210);
Config.setStudioPort(3211);
// Use the Edge that ships with Windows instead of downloading a separate headless Chrome.
const EDGE = "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";
if (process.platform === "win32" && require("node:fs").existsSync(EDGE)) Config.setBrowserExecutable(EDGE);
