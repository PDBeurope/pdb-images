/**
 * Copyright (c) 2023 EMBL - European Bioinformatics Institute, licensed under Apache 2.0, see LICENSE file for more info.
 *
 * @author Adam Midlik <midlik@gmail.com>
 */

import * as Paths from '../paths';


describe('paths', () => {
    it('filelist', async () => {
        expect(Paths.filelist(undefined, '1hda')).toEqual('1hda_filelist');
        expect(Paths.filelist('data/out', '1hda')).toEqual('data/out/1hda_filelist');
    });

    it('captionsJson', async () => {
        expect(Paths.captionsJson(undefined, '1hda')).toEqual('1hda.json');
        expect(Paths.captionsJson('data/out', '1hda')).toEqual('data/out/1hda.json');
    });

    it('expectedFilelist', async () => {
        expect(Paths.expectedFilelist(undefined, '1hda')).toEqual('1hda_expected_files.txt');
        expect(Paths.expectedFilelist('data/out', '1hda')).toEqual('data/out/1hda_expected_files.txt');
    });

    it('apiDataPath', async () => {
        expect(Paths.apiDataPath(undefined, '1hda')).toEqual('1hda_api_data.json');
        expect(Paths.apiDataPath('data/out', '1hda')).toEqual('data/out/1hda_api_data.json');
    });


    it('imageCaptionJson', async () => {
        expect(Paths.imageCaptionJson(undefined, '1hda_deposited_chain_front')).toEqual('1hda_deposited_chain_front.caption.json');
        expect(Paths.imageCaptionJson('data/out', '1hda_deposited_chain_front')).toEqual('data/out/1hda_deposited_chain_front.caption.json');
    });

    it('imageStateMolj', async () => {
        expect(Paths.imageStateMolj(undefined, '1hda_deposited_chain_front')).toEqual('1hda_deposited_chain_front.molj');
        expect(Paths.imageStateMolj('data/out', '1hda_deposited_chain_front')).toEqual('data/out/1hda_deposited_chain_front.molj');
    });

    it('image', async () => {
        expect(Paths.image(undefined, '1hda_deposited_chain_front', 'png', { width: 100, height: 100 })).toEqual('1hda_deposited_chain_front_image-100x100.png');
        expect(Paths.image(undefined, '1hda_deposited_chain_front', 'png', { width: 400, height: 300 })).toEqual('1hda_deposited_chain_front_image-400x300.png');
        expect(Paths.image('data/out', '1hda_deposited_chain_front', 'png', { width: 400, height: 300 })).toEqual('data/out/1hda_deposited_chain_front_image-400x300.png');
        expect(Paths.image('data/out', '1hda_deposited_chain_front', 'webp', { width: 400, height: 300 })).toEqual('data/out/1hda_deposited_chain_front_image-400x300.webp');
    });
});
