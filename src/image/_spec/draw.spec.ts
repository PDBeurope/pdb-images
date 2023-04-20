/**
 * Copyright (c) 2023 EMBL - European Bioinformatics Institute, licensed under Apache 2.0, see LICENSE file for more info.
 *
 * @author Adam Midlik <midlik@gmail.com>
 */

import { RawImageData } from 'molstar/lib/commonjs/mol-plugin/util/headless-screenshot';

import { addAxisIndicators } from '../draw';
import { loadPngToRaw } from '../resize';


function getTestingImageWhite() {
    const width = 300;
    const height = 200;
    const img: RawImageData = { width, height, data: new Uint8ClampedArray(width * height * 4) };
    for (let i = 0; i < img.data.length; i++) img.data[i] = 255; // fill with opaque white
    return img;
}


describe('draw', () => {
    it('check image comparison', async () => {
        const img = getTestingImageWhite();
        const expected = await loadPngToRaw('./test_data/sample_images/white.png');
        expect(img).toEqual(expected);
    });

    it('addAxisIndicators - no axes', async () => {
        const img = getTestingImageWhite();
        const expected = await loadPngToRaw('./test_data/sample_images/white.png');
        expect(img).toEqual(expected);
    });

    it('addAxisIndicators - front view', async () => {
        const img = getTestingImageWhite();
        addAxisIndicators(img, 'front');
        const expected = await loadPngToRaw('./test_data/sample_images/axes_front.png');
        expect(img).toEqual(expected);
    });

    it('addAxisIndicators - side view', async () => {
        const img = getTestingImageWhite();
        addAxisIndicators(img, 'side');
        const expected = await loadPngToRaw('./test_data/sample_images/axes_side.png');
        expect(img).toEqual(expected);
    });

    it('addAxisIndicators - top view', async () => {
        const img = getTestingImageWhite();
        addAxisIndicators(img, 'top');
        const expected = await loadPngToRaw('./test_data/sample_images/axes_top.png');
        expect(img).toEqual(expected);
    });
});
