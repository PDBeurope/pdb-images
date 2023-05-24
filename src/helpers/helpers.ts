/**
 * Copyright (c) 2023 EMBL - European Bioinformatics Institute, licensed under Apache 2.0, see LICENSE file for more info.
 *
 * @author Adam Midlik <midlik@gmail.com>
 */

import fs from 'fs';
import zlib from 'zlib';

import { PluginStateSnapshotManager } from 'molstar/lib/commonjs/mol-plugin-state/manager/snapshots';
import { HeadlessPluginContext } from 'molstar/lib/commonjs/mol-plugin/headless-plugin-context';
import { deepClone } from 'molstar/lib/commonjs/mol-util/object';

import { ModifiedResidueRecord } from '../api';
import { SubstructureDef } from './substructure-def';


/** Like `Partial<T>` but recursive (i.e. values themselves can be partial). */
export type PPartial<T> = T extends {} ? { [P in keyof T]?: PPartial<T[P]> } | undefined : T

/** Create a new object with values from `first`, optionally overridden by values from `second`, recursively.
 * (I know there is `mergeDeep` in `immutable` but this implementation also gives type hints). */
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

/** Decide if `obj` is a good old object (not array or null or other type). */
function isReallyObject(obj: any) {
    return typeof obj === 'object' && obj !== null && !Array.isArray(obj);
}

/** Return an object with keys `keys` and their values same as in `obj` */
export function pickObjectKeys<T, K extends keyof T>(obj: T, keys: K[]): Pick<T, K> {
    const result: Partial<Pick<T, K>> = {};
    for (const key of keys) {
        result[key] = obj[key];
    }
    return result as Pick<T, K>;
}


/** Information about occurences of a modified residue in a structure. */
export interface ModifiedResidueInfo {
    /** Compound identifier, e.g. MSE */
    compId: string,
    /** Human friendly compound name, e.g. Selenomethionine */
    compName: string,
    /** Number of occurrences in the structure */
    nInstances: number,
    /** Definition of a substructure consisting of all occurrences of this modified residue */
    instances: SubstructureDef.Sets,
}

/** Get `ModifiedResidueInfo` object from a list of records from API. */
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

/** Return a string for consistent labeling of chains (includes label_asym_id plus auth_asym_id if different). */
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

/** Parse integer, fail early. */
export function parseIntStrict(str: string): number {
    if (str === '') throw new Error('Is empty string');
    const result = Number(str);
    if (isNaN(result)) throw new Error('Is NaN');
    if (Math.floor(result) !== result) throw new Error('Is not integer');
    return result;
}

/** Convert string to kebab case, e.g. 'My favorite things' -> 'my-favorite-things'. */
export function toKebabCase(text: string): string {
    return text.toLowerCase().replace(/[^\w]+/g, '-');
}

/** Fetch data from `url` (http://, https://, file://) and return as bytes */
export async function fetchUrl(url: string): Promise<ArrayBuffer> {
    if (url.startsWith('file://')) {
        return fs.readFileSync(url.substring('file://'.length));
    } else {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Fetch failed with code ${response.status} (${url})`);
        return await response.arrayBuffer();
    }
}

/** Uncompress data using compressed by gzip */
export function gunzipData(data: ArrayBuffer): Promise<Buffer> {
    return new Promise((resolve, reject) => {
        return zlib.gunzip(data, (err, result) => {
            if (err) reject(err);
            else resolve(result);
        });
    });
}

/** Helper class for saving state of a Mol* plugin in MOLJ JSON format.
 * Allows some replacements to be applied to the saved state
 * (e.g. replace private URL used runtime by a public URL). */
export class MoljStateSaver {
    constructor(
        public readonly plugin: HeadlessPluginContext,
        /** Optional values to replace the real values when saving state in MOLJ.
         *  `null` means replace by `null`, `undefined` means do not replace. */
        public readonly replacements: {
            /** Replacement for `params.url` in 'ms-plugin.download' nodes */
            downloadUrl?: string | null,
            /** Replacement for `params.isBinary` in 'ms-plugin.download' nodes */
            downloadBinary?: boolean | null,
            /** Replacement for `params.properties.pdbe_structure_quality_report.serverUrl` in 'ms-plugin.custom-model-properties' nodes */
            pdbeStructureQualityReportServerUrl?: string | null,
        } = {},
    ) { }

    /** Save state in MOLJ format into `filename`. Apply replacements, if they were provided in the constructor. */
    async save(filename: string) {
        const snapshot = deepClone(await this.plugin.getStateSnapshot());
        this.applyReplacements(snapshot);
        const snapshot_json = JSON.stringify(snapshot, null, 2);
        await new Promise<void>(resolve => fs.writeFile(filename, snapshot_json, () => resolve()));
    }

    /** Apply replacements to a MOLJ-encoded plugin state. */
    private applyReplacements(state: PluginStateSnapshotManager.StateSnapshot) {
        for (const entry of state.entries) {
            for (const transform of entry.snapshot.data?.tree.transforms ?? []) {
                if (transform.transformer === 'ms-plugin.download' && this.replacements?.downloadUrl !== undefined) { // check specifically for undefined, as null means replace by null
                    transform.params.url = this.replacements.downloadUrl;
                }
                if (transform.transformer === 'ms-plugin.download' && this.replacements?.downloadBinary !== undefined) { // check specifically for undefined, as null means replace by null
                    transform.params.isBinary = this.replacements.downloadBinary;
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

