import { Config } from "@remotion/cli/config";
import { existsSync } from "node:fs";

Config.setVideoImageFormat("jpeg");
Config.setJpegQuality(95);
Config.setCodec("h264");
Config.setCrf(16);
Config.setPixelFormat("yuv420p");
Config.setOverwriteOutput(true);
// Port 3000 belongs to the bot's own server.
Config.setPort(3220);
Config.setStudioPort(3221);
// Render with the Edge that ships with Windows instead of downloading a headless Chrome.
const EDGE = "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";
if (process.platform === "win32" && existsSync(EDGE)) Config.setBrowserExecutable(EDGE);
