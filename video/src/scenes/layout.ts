import { APP_H, APP_W } from "../timeline";

// Where the app window sits in the 1920x1080 frame (caption on the left, window on the right).
const WIDTH = 1220;
const SCALE = WIDTH / APP_W;
export const WINDOW = { x: 600, y: Math.round((1080 - (APP_H * SCALE + 40)) / 2), width: WIDTH };

// App coordinates -> video coordinates (for the cursor, which is drawn over the window).
export const toVideo = (x: number, y: number) => ({ x: WINDOW.x + x * SCALE, y: WINDOW.y + 40 + y * SCALE });
