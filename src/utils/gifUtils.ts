import { GifReader } from 'omggif';

export interface GifFrame {
    imageData: ImageData;
    delay: number;
}

/**
 * Fetches a GIF from a URL and extracts its frames, applying a color replacement.
 * colorMode 'dark': White -> Accent Color.
 * colorMode 'light': White -> Accent Color, Black -> White.
 */
export async function extractAndRecolorGifFrames(
    url: string,
    accentColor: string,
    size: number,
    colorMode: 'light' | 'dark' = 'dark'
): Promise<GifFrame[]> {
    const response = await fetch(url);
    const buffer = await response.arrayBuffer();
    const reader = new GifReader(new Uint8Array(buffer));

    const frames: GifFrame[] = [];
    const { width, height } = reader;

    // Create a temporary canvas to draw frames into and extract data
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = width;
    tempCanvas.height = height;
    const tempCtx = tempCanvas.getContext('2d', { willReadFrequently: true });
    if (!tempCtx) return [];

    // Parse accent color
    const accentRgb = hexToRgb(accentColor);

    // We need to maintain the cumulative image state because GIFs often use "disposal methods"
    // where a frame only encodes changes from the previous one.
    // However, simple GIFs often just replace the whole frame.
    // For most logo animations, we can draw frame by frame onto the same context.

    for (let i = 0; i < reader.numFrames(); i++) {
        const frameInfo = reader.frameInfo(i);
        const frameData = new Uint8Array(width * height * 4);

        // Decode the frame into our buffer
        reader.decodeAndBlitFrameRGBA(i, frameData);

        // Apply color replacement
        for (let j = 0; j < frameData.length; j += 4) {
            const r = frameData[j];
            const g = frameData[j + 1];
            const b = frameData[j + 2];
            const a = frameData[j + 3];

            if (a === 0) continue;

            const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

            if (colorMode === 'dark') {
                // Dark Mode: White -> Accent
                if (luminance > 0.8) {
                    frameData[j] = accentRgb.r;
                    frameData[j + 1] = accentRgb.g;
                    frameData[j + 2] = accentRgb.b;
                }
            } else {
                // Light Mode: White -> Accent, Black -> White
                if (luminance > 0.8) {
                    // White pixels (important parts) -> Accent
                    frameData[j] = accentRgb.r;
                    frameData[j + 1] = accentRgb.g;
                    frameData[j + 2] = accentRgb.b;
                } else if (luminance < 0.2) {
                    // Black pixels (background) -> White
                    frameData[j] = 255;
                    frameData[j + 1] = 255;
                    frameData[j + 2] = 255;
                }
            }
        }

        // Convert processed buffer to ImageData
        const imgData = new ImageData(new Uint8ClampedArray(frameData), width, height);

        // If the size requested is different from GIF natural size, we need to scale
        if (width !== size || height !== size) {
            const scaleCanvas = document.createElement('canvas');
            scaleCanvas.width = size;
            scaleCanvas.height = size;
            const scaleCtx = scaleCanvas.getContext('2d');
            if (scaleCtx) {
                // Put processed frame into a temp canvas to scale it
                const frameCanvas = document.createElement('canvas');
                frameCanvas.width = width;
                frameCanvas.height = height;
                frameCanvas.getContext('2d')?.putImageData(imgData, 0, 0);

                scaleCtx.drawImage(frameCanvas, 0, 0, size, size);
                frames.push({
                    imageData: scaleCtx.getImageData(0, 0, size, size),
                    delay: frameInfo.delay * 10 // delay is in hundredths of a second
                });
            }
        } else {
            frames.push({
                imageData: imgData,
                delay: frameInfo.delay * 10
            });
        }
    }

    return frames;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) return { r: 255, g: 255, b: 255 };
    return {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
    };
}
