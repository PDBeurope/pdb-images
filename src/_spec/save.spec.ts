/**
 * Copyright (c) 2023 EMBL - European Bioinformatics Institute, licensed under Apache 2.0, see LICENSE file for more info.
 *
 * @author Adam Midlik <midlik@gmail.com>
 */

import fs from 'fs';
import path from 'path';

import { loadPngToRaw } from '../image/resize';
import { makeSaveFunction, } from '../save';
import { getTestingHeadlessPlugin, isBorderBlank, isImageBlank } from './_utils';


describe('makeSaveFunction', () => {
    it('makeSaveFunction', async () => {
        const OUTPUT_DIR = './test_data/outputs/empty';
        fs.rmSync(OUTPUT_DIR, { recursive: true, force: true });
        fs.mkdirSync(OUTPUT_DIR, { recursive: true });
        expect(fs.existsSync(OUTPUT_DIR)).toBeTruthy();
        expect(fs.readdirSync(OUTPUT_DIR)).toHaveLength(0);

        const plugin = await getTestingHeadlessPlugin();
        try {
            const saveFunction = makeSaveFunction(plugin, OUTPUT_DIR, { size: [{ width: 200, height: 200 }, { width: 100, height: 100 }], render_each_size: false, no_axes: false }, 'https://nope.nope');
            await saveFunction({ filename: 'example_empty', description: 'Description', clean_description: 'Clean description', alt: 'Alt', _entry_id: 'empty', _view: 'front', _section: [] });
        } finally {
            plugin.dispose();
        }
        expect(fs.readdirSync(OUTPUT_DIR).sort()).toEqual([
            'example_empty.caption.json',
            'example_empty.molj',
            'example_empty_image-100x100.png',
            'example_empty_image-200x200.png',
        ]);

        // Check no generated images are blank, or overflowing through border
        const imageFull = await loadPngToRaw(path.join(OUTPUT_DIR, 'example_empty_image-200x200.png'));
        expect(isImageBlank(imageFull)).toBeFalsy();
        expect(isBorderBlank(imageFull)).toBeTruthy();

        const imageDownscaled = await loadPngToRaw(path.join(OUTPUT_DIR, 'example_empty_image-100x100.png'));
        expect(isImageBlank(imageDownscaled)).toBeFalsy();
        expect(isBorderBlank(imageDownscaled)).toBeTruthy();
    });
});
