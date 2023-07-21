import fs from 'fs';
import path from 'path';

import { PDBeAPI } from './api';
import { Args, ImageType, ImageTypesForModes } from './args';
import { getLogger } from './helpers/logging';
import { selectBestChainForDomains, sortDomainsByEntity } from './helpers/sifts';
import * as Paths from './paths';
import { safePromise } from './helpers/helpers';


const logger = getLogger(module);

/** Return list of files expected to be created, without suffixes, e.g. '1tqn_deposited_chain_front' */
async function getExpectedFilenameStems(args: Pick<Args, 'entry_id' | 'mode' | 'type' | 'view'>, api: PDBeAPI): Promise<string[]> {
    const types = new Set(args.type.includes('all') ? ImageTypesForModes[args.mode] : args.type);
    switch (args.mode) {
        case 'pdb':
            return getExpectedFilenameStemsForPdbMode(args.entry_id, types, args.view, api);
        case 'alphafold':
            return getExpectedFilenameStemsForAlphafoldMode(args.entry_id, types, args.view);
        default:
            throw new Error(`Invalid value for mode: ${args.mode}`);
    }
}

async function getExpectedFilenameStemsForPdbMode(entryId: string, types: Set<ImageType>, view: 'front' | 'all' | 'auto', api: PDBeAPI): Promise<string[]> {
    const result: string[] = [];
    const promises = {
        assemblies: safePromise(() => api.getAssemblies(entryId)),
        entities: safePromise(() => api.getEntityTypes(entryId)),
        domains: safePromise(() => api.getSiftsMappings(entryId)),
        chainCoverages: safePromise(() => api.getChainCoverages(entryId)),
        modresRecords: safePromise(() => api.getModifiedResidue(entryId)),
        methods: safePromise(() => api.getExperimentalMethods(entryId)),
    }; // run all API calls in parallel

    if (types.has('entry')) {
        if (view === 'front') {
            result.push(
                `${entryId}_deposited_chain`,
                `${entryId}_deposited_chemically_distinct_molecules`,
            );
        } else {
            result.push(
                `${entryId}_deposited_chain_front`,
                `${entryId}_deposited_chain_side`,
                `${entryId}_deposited_chain_top`,
                `${entryId}_deposited_chemically_distinct_molecules_front`,
                `${entryId}_deposited_chemically_distinct_molecules_side`,
                `${entryId}_deposited_chemically_distinct_molecules_top`,
            );
        }
    }
    if (types.has('assembly')) {
        const assemblies = await promises.assemblies.result();
        for (const assembly of assemblies) {
            const assId = assembly.assemblyId;
            if (view === 'front') {
                result.push(
                    `${entryId}_assembly_${assId}_chain`,
                    `${entryId}_assembly_${assId}_chemically_distinct_molecules`,
                );
            } else {
                result.push(
                    `${entryId}_assembly_${assId}_chain_front`,
                    `${entryId}_assembly_${assId}_chain_side`,
                    `${entryId}_assembly_${assId}_chain_top`,
                    `${entryId}_assembly_${assId}_chemically_distinct_molecules_front`,
                    `${entryId}_assembly_${assId}_chemically_distinct_molecules_side`,
                    `${entryId}_assembly_${assId}_chemically_distinct_molecules_top`,
                );
            }
        }
    }
    if (types.has('entity')) {
        const entities = await promises.entities.result();
        for (const entityId in entities) {
            const { type, compId } = entities[entityId];
            if (type !== 'water') {
                if (view === 'front') {
                    result.push(
                        `${entryId}_entity_${entityId}`,
                    );
                } else {
                    result.push(
                        `${entryId}_entity_${entityId}_front`,
                        `${entryId}_entity_${entityId}_side`,
                        `${entryId}_entity_${entityId}_top`,
                    );
                }
            }
        }
    }
    if (types.has('domain')) {
        const domains = await promises.domains.result();
        const chainCoverages = await promises.chainCoverages.result();
        const allDomains = sortDomainsByEntity(domains);
        const selectedDomains = selectBestChainForDomains(allDomains, chainCoverages);
        for (const [source, sourceDoms] of Object.entries(selectedDomains)) {
            for (const [familyId, familyDoms] of Object.entries(sourceDoms)) {
                for (const [entityId, entityDoms] of Object.entries(familyDoms)) {
                    const authChainId = entityDoms[0].chunks[0].authChainId;
                    if (view !== 'all') {
                        result.push(
                            `${entryId}_${entityId}_${authChainId}_${source}_${familyId}`,
                        );
                    } else {
                        result.push(
                            `${entryId}_${entityId}_${authChainId}_${source}_${familyId}_front`,
                            `${entryId}_${entityId}_${authChainId}_${source}_${familyId}_side`,
                            `${entryId}_${entityId}_${authChainId}_${source}_${familyId}_top`,
                        );
                    }
                }
            }
        }
    }
    if (types.has('ligand')) {
        const entities = await promises.entities.result();
        for (const entityId in entities) {
            const { type, compId } = entities[entityId];
            if (type === 'bound') {
                if (view !== 'all') {
                    result.push(
                        `${entryId}_ligand_${compId}`,
                    );
                } else {
                    result.push(
                        `${entryId}_ligand_${compId}_front`,
                        `${entryId}_ligand_${compId}_side`,
                        `${entryId}_ligand_${compId}_top`,
                    );
                }
            }
        }
    }
    if (types.has('modres')) {
        const modresRecords = await promises.modresRecords.result();
        const modresIds = Array.from(new Set(modresRecords.map(m => m.compoundId))).sort();
        for (const modresId of modresIds) {
            if (view === 'front') {
                result.push(
                    `${entryId}_modres_${modresId}`,
                );
            } else {
                result.push(
                    `${entryId}_modres_${modresId}_front`,
                    `${entryId}_modres_${modresId}_side`,
                    `${entryId}_modres_${modresId}_top`,
                );
            }
        }
    }
    if (types.has('bfactor')) {
        const methods = await promises.methods.result();
        const isFromDiffraction = methods.some(method => method.toLowerCase().includes('diffraction'));
        if (isFromDiffraction) {
            if (view !== 'all') {
                result.push(
                    `${entryId}_bfactor`,
                );
            } else {
                result.push(
                    `${entryId}_bfactor_front`,
                    `${entryId}_bfactor_side`,
                    `${entryId}_bfactor_top`,
                );
            }
        }
    }
    if (types.has('validation')) {
        if (view !== 'all') {
            result.push(
                `${entryId}_validation_geometry_deposited`,
            );
        } else {
            result.push(
                `${entryId}_validation_geometry_deposited_front`,
                `${entryId}_validation_geometry_deposited_side`,
                `${entryId}_validation_geometry_deposited_top`,
            );
        }
    }
    return result;
}

async function getExpectedFilenameStemsForAlphafoldMode(entryId: string, types: Set<ImageType>, view: 'front' | 'all' | 'auto'): Promise<string[]> {
    const result: string[] = [];
    if (types.has('plddt')) {
        if (view === 'front') {
            result.push(
                `${entryId}_plddt`,
            );
        } else {
            result.push(
                `${entryId}_plddt_front`,
                `${entryId}_plddt_side`,
                `${entryId}_plddt_top`,
            );
        }
    }
    return result;
}


/** Return list of files expected to be created, with suffixes, e.g. '1tqn_deposited_chain_front_image-800x800.png' */
export async function getExpectedFiles(args: Pick<Args, 'entry_id' | 'mode' | 'type' | 'view' | 'size'>, api: PDBeAPI): Promise<string[]> {
    const result = [
        Paths.filelist(undefined, args.entry_id),
        Paths.captionsJson(undefined, args.entry_id),
    ];
    const stems = await getExpectedFilenameStems(args, api);
    for (const stem of stems) {
        result.push(Paths.imageCaptionJson(undefined, stem));
        result.push(Paths.imageStateMolj(undefined, stem));
        for (const size of args.size) {
            result.push(Paths.imagePng(undefined, stem, size));
        }
    }
    return result;
}

/** Throw error if any of `files` is not present in `directory` */
export function checkMissingFiles(directory: string, files: string[], entryId: string) {
    const missing = [];
    for (const file of files) {
        const fullPath = path.join(directory, file);
        if (!fs.existsSync(fullPath)) {
            missing.push(file);
            logger.error(`Missing output file: ${file}`);
        } else if (fs.statSync(fullPath).size === 0) {
            missing.push(file);
            logger.error(`Empty output file: ${file}`);
        }
    }
    if (missing.length > 0) {
        const message = `There are ${missing.length} missing/empty output files. See list of expected files in ${Paths.expectedFilelist(undefined, entryId)}`;
        logger.error(message);
        throw new Error(message);
    } else {
        logger.debug(`Checking for missing/empty output files passed (all ${files.length} expected files are present)`);
    }
}


/** Like `Promise.all` but with objects instead of arrays */
async function promiseAllObj<T extends {}>(promisesObj: { [key in keyof T]: Promise<T[key]> }): Promise<T> {
    const keys = Object.keys(promisesObj);
    const promises = Object.values(promisesObj);
    const results = await Promise.all(promises);
    return objectFromKeysAndValues(keys, results) as any;
}

/** Create an object from keys and values (first key maps to first value etc.) */
function objectFromKeysAndValues<K extends keyof any, V>(keys: K[], values: V[]): Record<K, V> {
    const obj: Partial<Record<K, V>> = {};
    for (let i = 0; i < keys.length; i++) {
        obj[keys[i]] = values[i];
    }
    return obj as Record<K, V>;
}
