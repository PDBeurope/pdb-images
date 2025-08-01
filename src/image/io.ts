/**
 * Copyright (c) 2023-2025 EMBL - European Bioinformatics Institute, licensed under Apache 2.0, see LICENSE file for more info.
 *
 * @author Adam Midlik <midlik@gmail.com>
 */

import { RawImageData } from 'molstar/lib/commonjs/mol-plugin/util/headless-screenshot';
import sharp from 'sharp';


/** Save an image as a PNG/WEBP file (format decided based on outPath extension).
 * `imageData.data` is an array of length `imageData.width * imageData.height * 4`,
 * where each 4 numbers represent R, G, B, and alpha value of one pixels,
 * and pixels are ordered in C-style (i.e. by rows).
 */
export async function saveImage(imageData: RawImageData, outPath: string, resize?: { width: number, height: number }) {
    const { data, width, height } = imageData;
    const channels = Math.floor(data.length / (height * width));
    if (channels !== 4) {
        throw new Error('AssertionError: image export is only supported for images with 4 channels');
    }
    await new Promise<sharp.OutputInfo>((resolve, reject) => {
        let img = sharp(Uint8Array.from(data), { raw: { width, height, channels } });
        if (resize && !(resize.width === width && resize.height === height)) {
            const background = { r: data[0], g: data[1], b: data[2], alpha: data[3] / 255 }; // assuming top-left pixel is background
            img = img.resize(resize.width, resize.height, { fit: 'contain', background });
        }
        img.toFile(outPath, (error, info) => error ? reject(error) : resolve(info));
    });
}

/** Used in tests. Do not delete. */
export async function loadImage(inPath: string): Promise<RawImageData> {
    const img = sharp(inPath).ensureAlpha().raw();
    const buffer = await img.toBuffer();
    const metadata = await img.metadata();
    if (metadata.channels !== 4) new Error('AssertionError: image import is only supported for images with 4 channels');
    return { data: Uint8ClampedArray.from(buffer), width: metadata.width, height: metadata.height };
}
