import fs from 'fs';
import { PNG } from 'pngjs';
import { RawImageData } from 'molstar/lib/commonjs/mol-plugin/util/headless-screenshot';


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
    return { from, to, weight };
}

export async function saveRawToPng(imageData: RawImageData, outPath: string) {
    const png = new PNG({ width: imageData.width, height: imageData.height });
    png.data = Buffer.from(imageData.data.buffer);
    await new Promise<void>(resolve => {
        png.pack().pipe(fs.createWriteStream(outPath)).on('finish', resolve);
    });
}
