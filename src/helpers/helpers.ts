import fs from 'fs';

import { PluginStateSnapshotManager } from 'molstar/lib/commonjs/mol-plugin-state/manager/snapshots';
import { HeadlessPluginContext } from 'molstar/lib/commonjs/mol-plugin/headless-plugin-context';
import { deepEqual } from 'molstar/lib/commonjs/mol-util';
import { deepClone } from 'molstar/lib/commonjs/mol-util/object';

import { ModifiedResidueRecord } from '../api';
import { SubstructureDef } from './substructure-def';


/** Throw an error when a warning is issued. */
const FAIL_ON_WARNING = false;

export function warn(...args: any[]) {
    console.warn('WARNING:', ...args);
    if (FAIL_ON_WARNING) {
        throw new Error(`Warning thrown and FAIL_ON_WARNING===true (${args})`);
    }
}

export type PPartial<T> = T extends {} ? { [P in keyof T]?: PPartial<T[P]> } | undefined : T

/** I know there is `mergeDeep` in `immutable` but this also gives type hints */
export function deepMerge<T>(first: T, second: PPartial<T>): T {
    if (second === undefined) {
        return first as any;
    }
    if (isReallyObject(first) && isReallyObject(second)) {
        const result: any = { ...first };
        for (const key in second) {
            result[key] = deepMerge((first as any)[key], (second as any)[key]);
        }
        return result;
    }
    return second as any;
}

function isReallyObject(obj: any) {
    return typeof obj === 'object' && obj !== null && !Array.isArray(obj);
}

export function testDeepMerge() {
    const examples = [
        [1, 2, 2],
        [1, undefined, 1],
        [1, null, null],
        [1, {}, {}],
        [{}, 1, 1],
        [{}, { a: 5 }, { a: 5 }],
        [{ a: [] }, { a: 5 }, { a: 5 }],
        [{ a: { b: 1 } }, { a: { b: 2 } }, { a: { b: 2 } }],
        [{ a: { b: 1 } }, { a: { c: 2 } }, { a: { b: 1, c: 2 } }],
        [{ a: { b: 1 }, x: [1, 2, 3] }, { a: { c: 2 } }, { a: { b: 1, c: 2 }, x: [1, 2, 3] }],
        [{ a: { b: 1 }, x: [1, 2, 3] }, { x: 'hi', a: { c: 2 } }, { a: { b: 1, c: 2 }, x: 'hi' }],
    ];
    for (const [a, b, result] of examples) {
        const realResult = deepMerge(a, b);
        console.log(a, '+', b, '->', realResult);
        if (!deepEqual(realResult, result)) {
            throw new Error('AssertionError');
        }
    }
}


export type ModifiedResidueInfo = { compId: string, compName: string, nInstances: number, instances: SubstructureDef.Sets }

export function getModifiedResidueInfo(modifiedResidues: ModifiedResidueRecord[]) {
    const info: { [compId: string]: ModifiedResidueInfo } = {};
    for (const res of modifiedResidues) {
        info[res.compoundId] ??= { compId: res.compoundId, compName: res.compoundName, nInstances: 0, instances: SubstructureDef.Sets.create({}) };
        info[res.compoundId].nInstances += 1;
        (info[res.compoundId].instances.sets[res.labelChainId] ??= []).push(res.residueNumber);
    }
    const sortedInfo: typeof info = {};
    for (const compId of Object.keys(info).sort()) sortedInfo[compId] = info[compId];
    return sortedInfo;
}

export function chainLabel(labelChainId?: string, authChainId?: string) {
    if (labelChainId) {
        if (authChainId && authChainId !== labelChainId) {
            return `${labelChainId} [auth ${authChainId}]`;
        } else {
            return `${labelChainId}`;
        }
    } else {
        if (authChainId) {
            return `auth ${authChainId}`;
        } else {
            return `?`;
        }
    }
}

export function parseIntStrict(str: string): number {
    if (str === '') throw new Error('Is empty string');
    const result = Number(str);
    if (isNaN(result)) throw new Error('Is NaN');
    if (Math.floor(result) !== result) throw new Error('Is not integer');
    return result;
}

export function toKebabCase(text: string): string {
    return text.toLowerCase().replace(/[^\w]+/g, '-');
}


export class NaughtyStateSaver {
    constructor(
        public readonly plugin: HeadlessPluginContext,
        /** Optional values to replace the real values when saving state in MOLJ.
         *  null means replace by null, undefined means do not replace. */
        public readonly replacements: {
            /** Replacement for `params.url` in 'ms-plugin.download' nodes */
            downloadUrl?: string | null,
            /** Replacement for `params.properties.pdbe_structure_quality_report.serverUrl` in 'ms-plugin.custom-model-properties' nodes */
            pdbeStructureQualityReportServerUrl?: string | null,
        },
    ) { }

    async save(filepath: string) {
        // await this.plugin.saveImage(filepath.join(this.directory, name + '.png'));
        const snapshot = deepClone(await this.plugin.getStateSnapshot());
        this.applyReplacements(snapshot);
        const snapshot_json = JSON.stringify(snapshot, null, 2);
        await new Promise<void>(resolve => fs.writeFile(filepath, snapshot_json, () => resolve()));
    }

    applyReplacements(state: PluginStateSnapshotManager.StateSnapshot) {
        for (const entry of state.entries) {
            for (const transform of entry.snapshot.data?.tree.transforms ?? []) {
                if (transform.transformer === 'ms-plugin.download' && this.replacements?.downloadUrl !== undefined) { // check specifically for undefined, as null means replace by null
                    transform.params.url = this.replacements.downloadUrl;
                }
                if (transform.transformer === 'ms-plugin.custom-model-properties' && this.replacements?.pdbeStructureQualityReportServerUrl !== undefined) {
                    if (transform.params.properties.pdbe_structure_quality_report) {
                        transform.params.properties.pdbe_structure_quality_report.serverUrl = this.replacements.pdbeStructureQualityReportServerUrl;
                    }
                }
            }
        }
    }
}

