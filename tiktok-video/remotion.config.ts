import { Config } from '@remotion/cli/config';

// WebGL : ANGLE (GPU) sur Mac/Windows ; sous Linux sans GPU, utiliser `swangle`.
Config.setChromiumOpenGlRenderer(process.platform === 'linux' ? 'swangle' : 'angle');
Config.setVideoImageFormat('jpeg');
Config.setPixelFormat('yuv420p');
