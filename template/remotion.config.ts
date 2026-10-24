import { Config } from "@remotion/cli/config";

Config.setEntryPoint("src/index.ts");
Config.setVideoImageFormat("jpeg");
Config.setJpegQuality(92);
Config.setCodec("h264");
Config.setCrf(18);
// Port 3000 is usually taken by an app dev server.
Config.setStudioPort(3710);
Config.setRendererPort(3720);
