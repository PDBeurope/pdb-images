/**
 * Copyright (c) 2023 EMBL - European Bioinformatics Institute, licensed under Apache 2.0, see LICENSE file for more info.
 *
 * @author Adam Midlik <midlik@gmail.com>
 */

import { ChainIndex, Model, Structure } from 'molstar/lib/commonjs/mol-model/structure';
import { Entities } from 'molstar/lib/commonjs/mol-model/structure/model/properties/common';


/** Entity type (i.e. value of _entity.type in mmCIF): polymer, non-polymer, water... */
type EntityType = ReturnType<Entities['data']['type']['value']>

/** Basic info about several entities, mapped by entityId */
export type EntityInfo = ReturnType<typeof getEntityInfo>

/** Return basic info about entities in the structure, mapped by entityId */
export function getEntityInfo(structure: Structure) {
    const entities = structure.model.entities;
    const ent: { [entityId: string]: { description: string, type: EntityType, chains: ChainIndex[], index: number } } = {};

    for (let i = 0; i < entities.data._rowCount; i++) {
        const id = entities.data.id.value(i);
        const type = entities.data.type.value(i);
        const desc = entities.data.pdbx_description.value(i);
        const description = desc.join(', ').replace(/\b(\d+), (\d+)\b/g, '$1,$2');
        // the regex fixes names like '1,2-ethanediol' (no space after comma, 1bvy) while keeping space in e.g. 'Endolysin, Beta-2 adrenergic receptor' (3sn6)
        ent[id] = { description, type, chains: [], index: i };
    }

    for (const unit of structure.units ?? []) {
        const firstElementIdx = unit.elements[0];
        const chainIdx = unit.model.atomicHierarchy.chainAtomSegments.index[firstElementIdx];
        const entityId = unit.model.atomicHierarchy.chains.label_entity_id.value(chainIdx);
        ent[entityId].chains.push(chainIdx);
    }
    return ent;
}

/** Info about a ligand (non-polymer entity) and its occurrences in a structure */
export interface LigandInfo {
    /** Three-letter code, e.g. HEM */
    compId: string,
    /** Human-friendly (or not) name of the ligand */
    description: string,
    /** Entity ID */
    entityId: string,
    /** label_asym_id of the first copy of this ligand (there can be more),  */
    chainId: string,
    /** auth_asym_id of the first copy of this ligand (there can be more),  */
    authChainId: string,
    /** Number of copies of this ligand in the deposited structure */
    nInstancesInEntry: number,
}

/** Return info about ligands (non-polymer entities) in the structure, mapped by compId */
export function getLigandInfo(structure: Structure) {
    const entityInfo = getEntityInfo(structure);
    for (const entityId in entityInfo) {
        const info = entityInfo[entityId];
        if (info.type !== 'non-polymer') {
            delete entityInfo[entityId];
        }
    };
    const hierarchy = structure.model.atomicHierarchy;
    const result: { [compId: string]: LigandInfo } = {};
    for (const [entityId, info] of Object.entries(entityInfo)) {
        const iChain = info.chains[0];
        const chainId = hierarchy.chains.label_asym_id.value(iChain);
        const authChainId = hierarchy.chains.auth_asym_id.value(iChain);
        const iAtom = hierarchy.chainAtomSegments.offsets[iChain];
        const compId = hierarchy.atoms.label_comp_id.value(iAtom);
        result[compId] = {
            compId: compId,
            description: info.description,
            entityId: entityId,
            chainId: chainId,
            authChainId: authChainId,
            nInstancesInEntry: info.chains.length,
        };
    }
    return result;
}

/** Return the number of residues forming each chain in the model, mapped by label_asym_id */
export function countChainResidues(model: Model): { [chainId: string]: number } {
    const counts = {} as { [chainId: string]: number };
    const nRes = model.atomicHierarchy.residueAtomSegments.count;
    for (let iRes = 0; iRes < nRes; iRes++) {
        const iAtom = model.atomicHierarchy.residueAtomSegments.offsets[iRes]; // first atom in the residue
        const iChain = model.atomicHierarchy.chainAtomSegments.index[iAtom];
        const chainId = model.atomicHierarchy.chains.label_asym_id.value(iChain);
        counts[chainId] ??= 0;
        counts[chainId] += 1;
    }
    return counts;
}

/** Return basic info about the chains in the model, mapped by label_asym_id */
export function getChainInfo(model: Model) {
    const result = {} as { [chainId: string]: { authChainId: string, entityId: string } };
    const chains = model.atomicHierarchy.chains;
    const nChains = chains._rowCount;
    for (let iChain = 0; iChain < nChains; iChain++) {
        const chainId = chains.label_asym_id.value(iChain);
        const authChainId = chains.auth_asym_id.value(iChain);
        const entityId = chains.label_entity_id.value(iChain);
        if (result[chainId]) throw new Error('AssertionError');
        result[chainId] = { authChainId, entityId };
    }
    return result;
}
