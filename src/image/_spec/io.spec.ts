/**
 * Copyright (c) 2023-2025 EMBL - European Bioinformatics Institute, licensed under Apache 2.0, see LICENSE file for more info.
 *
 * @author Adam Midlik <midlik@gmail.com>
 */

import fs from 'fs';
import path from 'path';
import { RawImageData } from 'molstar/lib/commonjs/mol-plugin/util/headless-screenshot';
import { loadImage, saveImage } from '../io';


// These sample images can be found in test_data/sample_images/ as PNGs

const IMG_10x8: RawImageData = {
    width: 10,
    height: 8,
    data: new Uint8ClampedArray([ // each line is one row of the image, pixels are separated by /**/
        10, 0, 100, 255, /**/ 10, 0, 100, 255, /**/ 0, 0, 50, 255, /**/ 0, 0, 50, 255, /**/ 0, 255, 0, 255, /**/ 0, 255, 0, 255, /**/ 0, 120, 20, 255, /**/ 0, 120, 20, 255, /**/ 30, 0, 0, 255, /**/ 30, 0, 0, 255,
        10, 0, 100, 255, /**/ 10, 0, 100, 255, /**/ 0, 0, 50, 255, /**/ 0, 0, 50, 255, /**/ 0, 255, 0, 255, /**/ 0, 255, 0, 255, /**/ 0, 120, 20, 255, /**/ 0, 120, 20, 255, /**/ 30, 0, 0, 255, /**/ 30, 0, 0, 255,
        0, 0, 0, 255, /**/ 0, 0, 0, 255, /**/ 0, 0, 0, 255, /**/ 0, 0, 0, 255, /**/ 255, 100, 40, 255, /**/ 255, 100, 40, 255, /**/ 120, 50, 10, 255, /**/ 120, 50, 10, 255, /**/ 0, 0, 0, 255, /**/ 0, 0, 0, 255,
        0, 0, 0, 255, /**/ 0, 0, 0, 255, /**/ 0, 0, 0, 255, /**/ 0, 0, 0, 255, /**/ 255, 100, 40, 255, /**/ 255, 100, 40, 255, /**/ 120, 50, 10, 255, /**/ 120, 50, 10, 255, /**/ 0, 0, 0, 255, /**/ 0, 0, 0, 255,
        0, 20, 0, 200, /**/ 0, 20, 0, 200, /**/ 0, 0, 0, 200, /**/ 0, 0, 0, 200, /**/ 100, 0, 30, 200, /**/ 100, 0, 30, 200, /**/ 50, 0, 0, 200, /**/ 50, 0, 0, 200, /**/ 0, 40, 0, 200, /**/ 0, 40, 0, 200,
        0, 20, 0, 200, /**/ 0, 20, 0, 200, /**/ 0, 0, 0, 200, /**/ 0, 0, 0, 200, /**/ 100, 0, 30, 200, /**/ 100, 0, 30, 200, /**/ 50, 0, 0, 200, /**/ 50, 0, 0, 200, /**/ 0, 40, 0, 200, /**/ 0, 40, 0, 200,
        20, 10, 255, 150, /**/ 20, 10, 255, 150, /**/ 0, 0, 120, 150, /**/ 0, 0, 120, 150, /**/ 0, 0, 0, 150, /**/ 0, 0, 0, 150, /**/ 0, 0, 0, 150, /**/ 0, 0, 0, 150, /**/ 40, 30, 0, 150, /**/ 40, 30, 0, 150,
        20, 10, 255, 150, /**/ 20, 10, 255, 150, /**/ 0, 0, 120, 150, /**/ 0, 0, 120, 150, /**/ 0, 0, 0, 150, /**/ 0, 0, 0, 150, /**/ 0, 0, 0, 150, /**/ 0, 0, 0, 150, /**/ 40, 30, 0, 150, /**/ 40, 30, 0, 150,
    ]),
};


describe('image io', () => {
    it('loadPngToRaw', async () => {
        const loadedImage = await loadImage('./test_data/sample_images/sample_image_10x8.png');
        expect(loadedImage).toEqual(IMG_10x8);
    });

    it('saveRawToPng', async () => {
        const FILENAME = './test_data/outputs/image_10x8.png';
        fs.mkdirSync(path.dirname(FILENAME), { recursive: true });
        fs.rmSync(FILENAME, { force: true });
        expect(fs.existsSync(FILENAME)).toBeFalsy();

        await saveImage(IMG_10x8, FILENAME);
        expect(fs.existsSync(FILENAME)).toBeTruthy();

        const loadedImage = await loadImage(FILENAME);
        expect(loadedImage).toEqual(IMG_10x8);
    });
});
