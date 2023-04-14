import fs from 'fs';
import { RawImageData } from 'molstar/lib/commonjs/mol-plugin/util/headless-screenshot';
import { addAxisIndicators } from '../draw';
import { saveRawToPng } from '../resize';

describe('draw', () => {
    it('addAxisIndicators', async () => {
        const width = 300;
        const height = 200;
        const img: RawImageData = { width, height, data: new Uint8ClampedArray(width * height * 4) };
        for (let i = 0; i < img.data.length; i++) img.data[i] = 255; // fill with opaque white
        addAxisIndicators(img, 'front');
        // await saveRawToPng(img, './test_data/sample_images/axes_front.png');

        // TODO continue here
    });
});