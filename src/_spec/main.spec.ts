import fs from 'fs';

import { Args, main, makeSaveFunction } from '../main';
import { getTestingHeadlessPlugin } from './_utils';


const TEST_TIMEOUT = 600_000; // ms


describe('makeSaveFunction', () => {
    it('makeSaveFunction', async () => {
        const OUTPUT_DIR = './test_data/outputs';
        fs.rmSync(OUTPUT_DIR, { recursive: true, force: true });
        fs.mkdirSync(OUTPUT_DIR, { recursive: true });
        expect(fs.existsSync(OUTPUT_DIR)).toBeTruthy();
        expect(fs.readdirSync(OUTPUT_DIR)).toHaveLength(0);

        const plugin = await getTestingHeadlessPlugin();
        try {
            const saveFunction = makeSaveFunction(plugin, OUTPUT_DIR, { size: [{ width: 200, height: 200 }, { width: 100, height: 100 }], render_each_size: false, no_axes: false }, 'https://nope.nope');
            await saveFunction({ filename: 'example_empty', description: 'Description', clean_description: 'Clean description', alt: 'Alt', _entry_id: '1hda', _view: undefined, _section: [] });
        } finally {
            plugin.dispose();
        }
        expect(fs.readdirSync(OUTPUT_DIR).sort()).toEqual([
            'example_empty.caption.json',
            'example_empty.molj',
            'example_empty_image-100x100.png',
            'example_empty_image-200x200.png',
        ]);
    });
});


describe('main', () => {
    it('main', async () => {
        const OUTPUT_DIR = './test_data/outputs';
        fs.rmSync(OUTPUT_DIR, { recursive: true, force: true });
        expect(fs.existsSync(OUTPUT_DIR)).toBeFalsy();

        const args: Args = {
            pdbid: '1ad5',
            api_url: 'file://./test_data/api',
            no_api: false,
            size: [{ width: 200, height: 200 }, { width: 100, height: 100 }],
            view: 'front',
            render_each_size: false,
            type: ['all'],
            opaque_background: true,
            no_axes: false,
            date: undefined,
            clear: true,
            log: 'debug',
        };
        await main(args);
        // TODO check all files have been generated and that images are not blank but have blank border
    }, TEST_TIMEOUT);

    // TODO continue here
    test.todo('some tests');
});