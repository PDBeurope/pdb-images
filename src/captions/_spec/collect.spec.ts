import fs from 'fs';

import { collectCaptions } from '../collect';


describe('captions collect', () => {
    it('collectCaptions .json', () => {
        fs.rmSync('./test_data/captions/1l7c/1l7c.json', { force: true });
        expect(fs.existsSync('./test_data/captions/1l7c/1l7c.json')).toBeFalsy();

        collectCaptions('./test_data/captions/1l7c', '1l7c', '2023-04-04');
        expect(fs.existsSync('./test_data/captions/1l7c/1l7c.json')).toBeTruthy();

        const expectedOutput = JSON.parse(fs.readFileSync('./test_data/captions/1l7c-expected.json', { encoding: 'utf8' }));
        const realOutput = JSON.parse(fs.readFileSync('./test_data/captions/1l7c/1l7c.json', { encoding: 'utf8' }));
        expect(realOutput).toEqual(expectedOutput);
    });

    it('collectCaptions _filelist', () => {
        fs.rmSync('./test_data/captions/1l7c/1l7c_filelist', { force: true });
        expect(fs.existsSync('./test_data/captions/1l7c/1l7c_filelist')).toBeFalsy();

        collectCaptions('./test_data/captions/1l7c', '1l7c', '2023-04-04');
        expect(fs.existsSync('./test_data/captions/1l7c/1l7c_filelist')).toBeTruthy();

        const expectedOutput = fs.readFileSync('./test_data/captions/1l7c-expected_filelist', { encoding: 'utf8' });
        const realOutput = fs.readFileSync('./test_data/captions/1l7c/1l7c_filelist', { encoding: 'utf8' });
        expect(realOutput).toEqual(expectedOutput);
    });
});
