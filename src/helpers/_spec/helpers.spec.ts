import fs from 'fs';
import { PluginStateSnapshotManager } from 'molstar/lib/commonjs/mol-plugin-state/manager/snapshots';
import { assignEntityAndUnitColors, cycleIterator } from '../colors';
import { MoljStateSaver, chainLabel, deepMerge, getModifiedResidueInfo, parseIntStrict, toKebabCase } from '../helpers';
import { getTestingHeadlessPlugin, getTestingPlugin, getTestingStructure } from '../../_spec/_utils';
import { setFSModule } from 'molstar/lib/commonjs/mol-util/data-source';

describe('colors', () => {
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

    it('MoljStateSaver', async () => {
        fs.rmSync('./test_data/output_1hda_changed.molj', { force: true });
        const snapshot = JSON.parse(fs.readFileSync(`./test_data/states/1hda.molj`, { encoding: 'utf8' }));
        const plugin = await getTestingHeadlessPlugin();
        try {
            const saver = new MoljStateSaver(plugin, { downloadUrl: 'https://structure.bcif', downloadBinary: true, pdbeStructureQualityReportServerUrl: 'https://quality.json' });
            await plugin.managers.snapshot.setStateSnapshot(snapshot);
            await saver.save('./test_data/output_1hda_changed.molj');

            const changed = JSON.parse(fs.readFileSync(`./test_data/output_1hda_changed.molj`, { encoding: 'utf8' }));
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
            fs.rmSync('./test_data/output_1hda_changed.molj', { force: true });
        } finally {
            plugin.dispose();
        }
    });
});

