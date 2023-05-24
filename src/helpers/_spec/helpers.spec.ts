/**
 * Copyright (c) 2023 EMBL - European Bioinformatics Institute, licensed under Apache 2.0, see LICENSE file for more info.
 *
 * @author Adam Midlik <midlik@gmail.com>
 */

import fs from 'fs';
import path from 'path';

import { MoljStateSaver, chainLabel, deepMerge, fetchUrl, getModifiedResidueInfo, parseIntStrict, pickObjectKeys, safePromise, toKebabCase } from '../helpers';
import { getTestingHeadlessPlugin } from '../../_spec/_utils';
import { gunzipData } from '../helpers';


describe('helpers', () => {
    it('deepMerge - replace value simple', () => {
        expect(deepMerge(1 as any, 2)).toEqual(2);
        expect(deepMerge(1 as any, null)).toEqual(null);
        expect(deepMerge(1 as any, {})).toEqual({});
        expect(deepMerge({} as any, 1)).toEqual(1);
    });
    it('deepMerge - replace value', () => {
        expect(deepMerge({ a: [] } as any, { a: 5 })).toEqual({ a: 5 });
        expect(deepMerge({ a: { b: 1 } } as any, { a: { b: 2 } })).toEqual({ a: { b: 2 } });
    });
    it('deepMerge - do not replace by undefined', () => {
        expect(deepMerge(1 as any, undefined)).toEqual(1);
        expect(deepMerge({ a: 1, b: 2 } as any, { b: undefined })).toEqual({ a: 1, b: 2 });
    });
    it('deepMerge - add value', () => {
        expect(deepMerge({} as any, { a: 5 })).toEqual({ a: 5 });
        expect(deepMerge({ a: { b: 1 } } as any, { a: { c: 2 } })).toEqual({ a: { b: 1, c: 2 } });
        expect(deepMerge({ a: { b: 1 }, x: [1, 2, 3] } as any, { a: { c: 2 } })).toEqual({ a: { b: 1, c: 2 }, x: [1, 2, 3] });
    });
    it('deepMerge - add value and replace value', () => {
        expect(deepMerge({ a: { b: 1 }, x: [1, 2, 3] } as any, { x: 'hi', a: { c: 2 } })).toEqual({ a: { b: 1, c: 2 }, x: 'hi' });
    });

    it('pickObjectKeys', () => {
        expect(pickObjectKeys({ a: 1, b: 2, c: 3, d: 4 }, [])).toEqual({});
        expect(pickObjectKeys({ a: 1, b: 2, c: 3, d: 4 }, ['a', 'd'])).toEqual({ a: 1, d: 4 });
        expect(pickObjectKeys({ a: 1, b: 2, c: 3, d: 4 }, ['a', 'b', 'c', 'd'])).toEqual({ a: 1, b: 2, c: 3, d: 4 });
    });

    it('getModifiedResidueInfo', () => {
        expect(getModifiedResidueInfo([])).toEqual({});

        expect(getModifiedResidueInfo([
            { entityId: 1, labelChainId: 'X', authChainId: 'A', residueNumber: 123, compoundId: 'MSE', compoundName: 'Selenomethionine' },
        ])).toEqual({
            'MSE': {
                compId: 'MSE',
                compName: 'Selenomethionine',
                nInstances: 1,
                instances: {
                    kind: 'sets',
                    label: undefined,
                    sets: { 'X': [123] },
                },
            }
        });

        expect(getModifiedResidueInfo([
            { entityId: 1, labelChainId: 'X', authChainId: 'A', residueNumber: 123, compoundId: 'MSE', compoundName: 'Selenomethionine' },
            { entityId: 1, labelChainId: 'X', authChainId: 'A', residueNumber: 456, compoundId: 'MSE', compoundName: 'Selenomethionine' },
            { entityId: 2, labelChainId: 'Y', authChainId: 'B', residueNumber: 666, compoundId: 'MSE', compoundName: 'Selenomethionine' },
            { entityId: 5, labelChainId: 'Z', authChainId: 'C', residueNumber: 999, compoundId: 'SUI', compoundName: '(3-AMINO-2,5-DIOXO-1-PYRROLIDINYL)ACETIC ACID' },
        ])).toEqual({
            'MSE': {
                compId: 'MSE',
                compName: 'Selenomethionine',
                nInstances: 3,
                instances: {
                    kind: 'sets',
                    label: undefined,
                    sets: { 'X': [123, 456], 'Y': [666] },
                },
            },
            'SUI': {
                compId: 'SUI',
                compName: '(3-AMINO-2,5-DIOXO-1-PYRROLIDINYL)ACETIC ACID',
                nInstances: 1,
                instances: {
                    kind: 'sets',
                    label: undefined,
                    sets: { 'Z': [999] },
                },
            }
        });
    });

    it('chainLabel', () => {
        expect(chainLabel()).toEqual('?');
        expect(chainLabel('A')).toEqual('A');
        expect(chainLabel('A', 'A')).toEqual('A');
        expect(chainLabel('A', 'B')).toEqual('A [auth B]');
        expect(chainLabel(undefined, 'B')).toEqual('auth B');
    });

    it('parseIntStrict parses valid', () => {
        expect(parseIntStrict('0')).toBe(0);
        expect(parseIntStrict('1')).toBe(1);
        expect(parseIntStrict('-1000')).toBe(-1000);
    });

    it('parseIntStrict throws on invalid', () => {
        expect(() => parseIntStrict('')).toThrow();
        expect(() => parseIntStrict('your mumma')).toThrow();
        expect(() => parseIntStrict('NaN')).toThrow();
        expect(() => parseIntStrict('1.2')).toThrow();
        expect(() => parseIntStrict('10ish')).toThrow();
    });

    it('toKebabCase', () => {
        expect(toKebabCase('')).toEqual('');
        expect(toKebabCase('Hello')).toEqual('hello');
        expect(toKebabCase('My favorite things')).toEqual('my-favorite-things');
        expect(toKebabCase('Wait for it ... $ # @?          NOPE!')).toEqual('wait-for-it-nope-');
    });

    it('fetchUrl', async () => {
        const URL = 'file://./test_data/dummy/sample.txt';
        const fetched = await fetchUrl(URL);
        expect(String(fetched)).toEqual('Spanish Inquisition!');
    });

    it('gunzipData', async () => {
        const URL = 'file://./test_data/dummy/sample.txt.gz';
        const fetched = await fetchUrl(URL);
        const uncompressed = await gunzipData(fetched);
        expect(String(uncompressed)).toEqual('Spanish Inquisition!');
    });

    it('safePromise - resolving promise -> resolve', async () => {
        const goodPromise = safePromise(() => goodFunction());
        const result = await goodPromise.result();
        expect(result).toEqual('B');
    });
    it('safePromise - awaited rejecting promise -> throw', async () => {
        const badPromise = safePromise(() => badFunction());
        const goodPromise = safePromise(() => goodFunction());
        let thrown: boolean = false;
        try {
            const result = await badPromise.result();
        } catch {
            thrown = true;
        }
        expect(thrown).toEqual(true);
    });
    it('safePromise - unawaited rejecting promise -> do not throw', async () => {
        const badPromise = safePromise(() => badFunction());
        const goodPromise = safePromise(() => goodFunction());
        const result = await goodPromise.result();
        expect(result).toEqual('B');
    });
    it('safePromise - nested unawaited rejecting promise -> do not throw', async () => {
        const badPromise = safePromise(() => foo());
        const badPromise2 = safePromise(() => bar());
        const goodPromise = safePromise(() => goodFunction());
        await sleep(1000);
        const result = await goodPromise.result();
        expect(result).toEqual('B');
    });


    it('MoljStateSaver', async () => {
        const INPUT_FILE = './test_data/states/1hda.molj';
        const OUTPUT_FILE = './test_data/outputs/1hda_changed.molj';
        fs.mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true });
        fs.rmSync(OUTPUT_FILE, { force: true });
        expect(fs.existsSync(OUTPUT_FILE)).toBeFalsy();

        const snapshot = JSON.parse(fs.readFileSync(INPUT_FILE, { encoding: 'utf8' }));
        const plugin = await getTestingHeadlessPlugin();
        try {
            const saver = new MoljStateSaver(plugin, { downloadUrl: 'https://structure.bcif', downloadBinary: true, pdbeStructureQualityReportServerUrl: 'https://quality.json' });
            await plugin.managers.snapshot.setStateSnapshot(snapshot);
            await saver.save(OUTPUT_FILE);

            expect(fs.existsSync(OUTPUT_FILE)).toBeTruthy();
            const changed = JSON.parse(fs.readFileSync(OUTPUT_FILE, { encoding: 'utf8' }));
            const changedTransforms = changed.entries[0].snapshot.data.tree.transforms;
            const changedDownloadTransforms = changedTransforms.filter((t: any) => t.transformer === 'ms-plugin.download');
            const changedQualityTransforms = changedTransforms.filter((t: any) => t.transformer === 'ms-plugin.custom-model-properties');

            expect(changedTransforms).not.toHaveLength(0);
            expect(changedDownloadTransforms).not.toHaveLength(0);
            expect(changedQualityTransforms).not.toHaveLength(0);

            for (const transform of changedDownloadTransforms) {
                expect(transform.params.url).toEqual('https://structure.bcif');
                expect(transform.params.isBinary).toEqual(true);
            }
            for (const transform of changedQualityTransforms) {
                expect(transform.params.properties.pdbe_structure_quality_report.serverUrl).toEqual('https://quality.json');
            }
        } finally {
            plugin.dispose();
        }
    });
});

async function sleep(ms: number) {
    await new Promise<void>((resolve, reject) => setTimeout(() => resolve(), ms));
}
async function badFunction() {
    await sleep(500);
    throw new Error('A');
}
async function goodFunction() {
    await sleep(2000);
    return 'B';
}
async function foo() {
    await badFunction();
    return 5;
}
async function bar() {
    const magic = await foo();
    await goodFunction();
    return 37 + magic;
}