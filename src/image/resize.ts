/**
 * Copyright (c) 2023-2025 EMBL - European Bioinformatics Institute, licensed under Apache 2.0, see LICENSE file for more info.
 *
 * @author Adam Midlik <midlik@gmail.com>
 */

import { RawImageData } from 'molstar/lib/commonjs/mol-plugin/util/headless-screenshot';
import sharp from 'sharp';

/** Up- or down-sample image to a new size. */
export function resizeRawImage(img: RawImageData, newSize: { width: number, height: number }): RawImageData {
    const w0 = img.width;
    const h0 = img.height;
    const w1 = newSize.width;
    const h1 = newSize.height;
    const nChannels = Math.floor(img.data.length / (h0 * w0));
    const y = resamplingCoefficients(h0, h1);
    const x = resamplingCoefficients(w0, w1);
    const out = new Float32Array(h1 * w1 * nChannels); // Use better precision here to avoid rounding errors when summing many small numbers
    for (let i = 0; i < y.from.length; i++) { // row index
        for (let j = 0; j < x.from.length; j++) { // column index
            for (let c = 0; c < nChannels; c++) { // channel index
                out[(y.to[i] * w1 + x.to[j]) * nChannels + c] += img.data[(y.from[i] * w0 + x.from[j]) * nChannels + c] * y.weight[i] * x.weight[j];
                // alpha-channel should be treated in a special way, but even this works kinda OK
            }
        }
    }
    return { width: w1, height: h1, data: new Uint8ClampedArray(out) };
}

/** Calculate the weights of how much each pixel in the old image contributes to pixels in the new image, for 1D images
 * (pixel `from[i]` contributes to pixel `to[i]` with weight `weight[i]`).
 * Typically one old pixel will contribute to more new pixels and vice versa.
 * Sum of weights contributed to each new pixel must be equal to 1.
 * To use for 2D images, calculate row-wise and column-wise weights and multiply them. */
function resamplingCoefficients(nOld: number, nNew: number) {
    const scale = nNew / nOld;
    let i = 0;
    let j = 0;
    let p = 0;
    const from = [];
    const to = [];
    const weight = [];
    while (p < nNew) {
        const nextINotch = scale * (i + 1);
        const nextJNotch = j + 1;
        if (nextINotch <= nextJNotch) {
            from.push(i);
            to.push(j);
            weight.push(nextINotch - p);
            p = nextINotch;
            i += 1;
            if (nextINotch === nextJNotch) {
                j += 1;
            }
        } else {
            from.push(i);
            to.push(j);
            weight.push(nextJNotch - p);
            p = nextJNotch;
            j += 1;
        }
    }
    return {
        /** Index of a pixel in the old image */
        from,
        /** Index of a pixel in the new image */
        to,
        /** How much the `from` pixel's value contributes to the `to` pixel */
        weight,
    };
}

/** Save an image as a PNG/WEBP file (format decided based on outPath extension).
 * `imageData.data` is an array of length `imageData.width * imageData.height * 4`,
 * where each 4 numbers represent R, G, B, and alpha value of one pixels,
 * and pixels are ordered in C-style (i.e. by rows).
 */
export async function saveImage(imageData: RawImageData, outPath: string) {
    const { data, width, height } = imageData;
    const channels = Math.floor(data.length / (height * width));
    if (channels !== 1 && channels !== 2 && channels !== 3 && channels !== 4) {
        throw new Error('AssertionError: webp export is only supported for images with 1-4 channels');
    }
    await new Promise<sharp.OutputInfo>((resolve, reject) => {
        sharp(Uint8Array.from(data), { raw: { width, height, channels } })
            // .resize(200, 200)
            .toFile(outPath, (error, info) => error ? reject(error) : resolve(info));
    });
}
// TODO resize images directly in saveRawToWebp
