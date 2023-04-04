/**
 * Copyright (c) 2023 Adam Midlik, licensed under MIT, see LICENSE file for more info.
 *
 * @author Adam Midlik <midlik@gmail.com>
 */

import { chainLabel, ModifiedResidueInfo } from '../helpers/helpers';
import { EntityInfo, LigandInstanceInfo } from '../helpers/structure-info';
import { TextBuilder } from './text-builder';


/** Orientation of a 3D view.
 * Use `undefined` when only one view is being rendered, thus it is not necessary to specify orientation. */
export type ViewType = 'front' | 'side' | 'top' | undefined


/** Data needed to save an image, related captions, and metadata. */
export interface ImageSpec {
    /** File name (not necessarily full name, there might be an implicit suffix (legacy reasons)) */
    filename: string,
    /** Alternative description for HTML <img> element */
    alt: string,
    /** Image caption, possibly with HTML formatting */
    description: string,
    /** Image caption, plain-text */
    clean_description: string,
    /** PDB or AlphaFoldDB identifier*/
    _entry_id: string,
    /** View orientation */
    _view: ViewType,
    /** Location of the image in a hierarchy, e.g. ["entity", "1", "database", "CATH", "2.40.128.20"]. Use [] to keep flat hierarchy. */
    _section: string[],
    /** Any extra metadata that should get into the final caption files.  */
    _extras?: any,
}


/** Functions for generating captions (and `ImageSpec`) for various image types. */
export namespace Captions {
    const UL_ = "<ul class='image_legend_ul'>", _UL = '</ul>'; // Using apostrophes in HTML because this will have to be stored in JSON
    const LI_ = "<li class='image_legend_li'>", _LI = '</li>';
    const B_ = "<span class='highlight'>", _B = '</span>';

    /** Basic info about the stucture being rendered. */
    export interface StructureContext {
        /** PDB or AlphaFoldDB identifier */
        pdbId: string,
        /** Assembly identifier (e.g. '1', '2'), or `undefined` if this is the deposited model */
        assemblyId: string | undefined,
        /** Optional entity names to override names in `entityInfo` (those come from CIF) */
        entityNames: { [entityId: number]: string[] },
        entityInfo: EntityInfo,
    }

    /** Create captions for `entity` or `assembly` image type. */
    export function forEntryOrAssembly(context: StructureContext & { isPreferredAssembly: boolean, nModels: number, coloring: 'chains' | 'entities', view: ViewType }): ImageSpec {
        const { pdbId, assemblyId, isPreferredAssembly, nModels, coloring, entityInfo, view } = context;
        const colorClause = coloring === 'chains' ? 'by chain' : 'by chemically distinct molecules';
        const modelClause = nModels > 1 ? `ensemble of ${nModels} models` : '';
        const description = new TextBuilder();
        description.push(structurePhrase(context), 'of PDB entry', B_, pdbId, _B, 'coloured', colorClause, ',', modelClause, ',', viewPhrase(view), '.');
        description.push('This structure contains', ':', UL_);
        for (const entityId in entityInfo) {
            const name = entityName(context, entityId);
            const nCopies = entityInfo[entityId].chains.length;
            description.push(LI_, countNoun(nCopies, 'cop|y|ies'), 'of', B_, name, _B, ';', _LI);
        }
        description.push('.', _UL);
        const assemblyPrefix = assemblyId ? `assembly_${assemblyId}` : 'deposited';
        const colorSuffix = coloring === 'chains' ? 'chain' : 'chemically_distinct_molecules';
        return {
            filename: `${pdbId}_${assemblyPrefix}_${colorSuffix}${viewSuffix(view)}`,
            alt: new TextBuilder().push('PDB entry', pdbId, 'coloured', colorClause, ',', modelClause, ',', viewPhrase(view), '.').buildText(),
            description: description.buildText(),
            clean_description: description.buildPlainText(),
            _entry_id: pdbId,
            _view: view,
            _section: assemblyId ? ['assembly', assemblyId] : ['entry', 'all'],
            _extras: assemblyId ? { 'preferred': isPreferredAssembly } : undefined,
        };
    }

    /** Create captions for `bfactor` image type. */
    export function forBFactor(context: { pdbId: string, view: ViewType }): ImageSpec {
        const { pdbId, view } = context;
        const description = new TextBuilder();
        description.push('The deposited structure of PDB entry', B_, pdbId, _B, 'coloured by B-factor values', ',', viewPhrase(view), '.');
        description.push('The macromolecules are shown in backbone representation. The thickness reflects the B-factor values (thin = low, thick = high). The colour varies from blue to red corresponding to a B-factor range of 0 to 100 square angstroms.');
        return {
            filename: `${pdbId}_bfactor${viewSuffix(view)}`,
            alt: new TextBuilder().push('B-factors for PDB entry', pdbId, ',', viewPhrase(view), '.').buildText(),
            description: description.buildText(),
            clean_description: description.buildPlainText(),
            _entry_id: pdbId,
            _view: view,
            _section: ['entry', 'bfactor'],
        };
    }

    /** Create captions for `validation` image type. */
    export function forGeometryValidation(context: { pdbId: string, view: ViewType }): ImageSpec {
        const { pdbId, view } = context;
        const description = new TextBuilder();
        description.push('The deposited structure of PDB entry', B_, pdbId, _B, 'coloured by geometry validation', ',', viewPhrase(view), '.');
        description.push('Residues are coloured by the number of geometry outliers: green – no outliers, yellow – one outlier yellow, orange – two outliers, red – three or more outliers.');
        return {
            filename: `${pdbId}_validation_geometry_deposited${viewSuffix(view)}`,
            alt: new TextBuilder().push('Geometry outliers in PDB entry', pdbId, ',', viewPhrase(view), '.').buildText(),
            description: description.buildText(),
            clean_description: description.buildPlainText(),
            _entry_id: pdbId,
            _view: view,
            _section: ['validation', 'geometry', 'deposited'],
        };
    }

    /** Create captions for `plddt` image type. */
    export function forPlddt(context: { afdbId: string, view: ViewType }): ImageSpec {
        const { afdbId, view } = context;
        const description = new TextBuilder();
        description.push('The predicted structure of', B_, afdbId, _B, 'coloured by pLDDT confidence score', ',', viewPhrase(view), '.');
        description.push('Residues are coloured by pLDDT values: dark blue – very high (90–100), light blue – confident (70–90), yellow – low (50–70), orange – very low (0–50).');
        return {
            filename: `${afdbId}_plddt${viewSuffix(view)}`,
            alt: new TextBuilder().push('Predicted structure of', afdbId, ',', viewPhrase(view), '.').buildText(),
            description: description.buildText(),
            clean_description: description.buildPlainText(),
            _entry_id: afdbId,
            _view: view,
            _section: ['entry', 'plddt'],
        };
    }

    /** Create captions for `entity` image type. */
    export function forHighlightedEntity(context: StructureContext & { entityId: string, view: ViewType }): ImageSpec {
        const { pdbId, assemblyId, entityInfo, entityId, view } = context;
        const nCopies = entityInfo[entityId].chains.length;
        const name = entityName(context, entityId);
        const description = new TextBuilder();
        description.push(structurePhrase(context), 'of PDB entry', B_, pdbId, _B,
            'contains', countNoun(nCopies, 'cop|y|ies'), 'of', B_, name, _B, '.',
            capital(viewPhrase(view)), '.');
        return {
            filename: `${pdbId}_entity_${entityId}${viewSuffix(view)}`,
            alt: new TextBuilder().push(name, 'in PDB entry', pdbId, ',',
                (assemblyId ? `assembly ${assemblyId}` : ''), ',', viewPhrase(view), '.').buildText(),
            description: description.buildText(),
            clean_description: description.buildPlainText(),
            _entry_id: pdbId,
            _view: view,
            _section: ['entity', entityId],
        };
    }

    /** Create captions for `domain` image type. */
    export function forDomain(context: StructureContext & {
        source: string,
        familyId: string,
        familyName: string,
        entityId: string,
        chainId: string,
        authChainId: string,
        /** Number of domain instances in the whole deposited model */
        totalCopies: number,
        /** Number of domain instances in the shown chain */
        shownCopies: number,
        /** Number of domain instances in the shown chain which are completely out of the observed residue range (therefore not visible) */
        outOfRangeCopies: number,
        view: ViewType
    }): ImageSpec {
        const { pdbId, source, familyId, familyName, entityId, chainId, authChainId, totalCopies, shownCopies, outOfRangeCopies, view } = context;
        const name = entityName(context, entityId);
        const description = new TextBuilder();
        description.push('The deposited structure of PDB entry', B_, pdbId, _B,
            'contains', countNoun(totalCopies, 'cop|y|ies'), 'of', source, 'domain', B_, familyId, `(${familyName})`, _B, 'in', B_, name, _B, '.',
            'Showing', countNoun(shownCopies, 'cop|y|ies'), 'in chain', B_, chainLabel(chainId, authChainId), _B,
            (outOfRangeCopies > 0 ? (shownCopies > 1 ? '(some of the domains are out of the observed residue ranges!)' : '(this domain is out of the observed residue ranges!)') : ''),
            '.',
            capital(viewPhrase(view)), '.');
        return {
            filename: `${pdbId}_${entityId}_${authChainId}_${source}_${familyId}${viewSuffix(view)}`,
            alt: description.buildPlainText(),
            description: description.buildText(),
            clean_description: description.buildPlainText(),
            _entry_id: pdbId,
            _view: view,
            _section: ['entity', entityId, 'database', source, familyId],
        };
    }

    /** Create captions for `ligand` image type. */
    export function forLigandEnvironment(context: StructureContext & { ligandInfo: LigandInstanceInfo, view: ViewType }): ImageSpec {
        const { pdbId, ligandInfo, view } = context;
        const nCopies = ligandInfo.nInstancesInEntry;
        const name = entityName(context, ligandInfo.entityId);
        const description = new TextBuilder();
        description.push('The binding environment for', (nCopies === 1 ? '' : 'an instance of'), B_, ligandInfo.compId, `(${name})`, _B,
            'in PDB entry', B_, pdbId, _B, ',',
            'chain', B_, chainLabel(ligandInfo.chainId, ligandInfo.authChainId), _B, '.',
            capital(viewPhrase(view)), '.',
            'There', (nCopies === 1 ? 'is' : 'are'), countNoun(nCopies, 'cop|y|ies'), 'of', B_, ligandInfo.compId, _B, 'in the deposited model', '.');
        return {
            filename: `${pdbId}_ligand_${ligandInfo.compId}${viewSuffix(view)}`,
            alt: new TextBuilder().push('The binding environment for', (nCopies === 1 ? '' : 'an instance of'), ligandInfo.compId, 'in PDB entry', pdbId, ',',
                viewPhrase(view), '.').buildText(),
            description: description.buildText(),
            clean_description: description.buildPlainText(),
            _entry_id: pdbId,
            _view: view,
            _section: ['entry', 'ligands', ligandInfo.compId],
            _extras: { 'entity': ligandInfo.entityId, 'number_of_instances': ligandInfo.nInstancesInEntry },
        };
    }

    /** Create captions for `modres` image type. */
    export function forModifiedResidue(context: StructureContext & { modresInfo: ModifiedResidueInfo, view: ViewType }): ImageSpec {
        const { pdbId, assemblyId, modresInfo, view } = context;
        const assemblyPrefix = assemblyId ? `assembly-${assemblyId}` : 'entry';
        const nCopies = modresInfo.nInstances;
        const description = new TextBuilder();
        description.push(structurePhrase(context), 'of PDB entry', B_, pdbId, _B,
            'contains', countNoun(nCopies, 'instance|s'), 'of modified residue', B_, modresInfo.compId, `(${modresInfo.compName})`, _B, '.',
            capital(viewPhrase(view)), '.');
        return {
            filename: `${pdbId}_modres_${modresInfo.compId}${viewSuffix(view)}`,
            alt: new TextBuilder().push('Modified residue', modresInfo.compId, 'in PDB entry', pdbId, ',',
                (assemblyId ? `assembly ${assemblyId}` : ''), ',', viewPhrase(view), '.').buildText(),
            description: description.buildText(),
            clean_description: description.buildPlainText(),
            _entry_id: pdbId,
            _view: view,
            _section: ['entry', 'mod_res', modresInfo.compId],
        };
    }

    /** Return a phrase like 'The deposited structure' or 'Homo-tetrameric assembly 1' */
    function structurePhrase(context: StructureContext) {
        if (context.assemblyId) return `${capital(homoHeteroHowManyMer(context.entityInfo))}ic assembly ${context.assemblyId}`;
        else return 'The deposited structure';
    }

    /** Return a phrase like 'front view' or '' */
    function viewPhrase(view: ViewType) {
        if (view) return `${view} view`;
        else return '';
    }
    
    /** Return a filename suffix '-front' or '' */
    function viewSuffix(view: ViewType) {
        if (view) return `_${view}`;
        else return '';
    }

    /** Return a word like 'homo-tetramer' or 'hetero-20-mer', based on the number of polymeric chains in a structure. */
    function homoHeteroHowManyMer(entityInfo: EntityInfo): string {
        let nTypes = 0;
        for (const info of Object.values(entityInfo)) {
            if (info.type === 'polymer') {
                nTypes += 1;
            }
        }
        const suffix = howManyMer(entityInfo);
        if (suffix === 'monomer' || nTypes === 0) {
            return suffix; // nTypes can be zero, some entries don't contain polymer (1aga)
        } else if (nTypes === 1) {
            return 'homo-' + suffix;
        } else {
            return 'hetero-' + suffix;
        }
    }

    /** Return a word like 'tetramer' or '20-mer', based on the number of polymeric chains in a structure. */
    function howManyMer(entityInfo: EntityInfo): string {
        let polymerCount = 0;
        for (const info of Object.values(entityInfo)) {
            if (info.type === 'polymer') {
                polymerCount += info.chains.length;
            }
        }
        switch (polymerCount) {
            case 1: return 'monomer';
            case 2: return 'dimer';
            case 3: return 'trimer';
            case 4: return 'tetramer';
            case 5: return 'pentamer';
            case 6: return 'hexamer';
            case 7: return 'heptamer';
            case 8: return 'octamer';
            // The knowledge of Greek of whoever invented these terms, is getting blurry here...
            case 9: return 'nonamer';
            case 10: return 'decamer';
            case 11: return 'undecamer';
            case 12: return 'dodecamer';
            default: return `${polymerCount}-mer`;
        }
    }

    /** Retrieve an entity name from StructureContext. */
    function entityName(context: StructureContext, entityId: string) {
        const { entityNames, entityInfo } = context;
        return entityNames?.[entityId as any]?.[0] ?? entityInfo[entityId].description;
    }
}


/** Nicely format according to the number of items, e.g.
 * countNoun(1, 'atom|s') -> '1 atom', countNoun(2, 'atom|s') -> '2 atoms'
 * 1 cop|y|ies -> 1 copy, 2 cop|y|ies -> 2 copies
 * 1 |mouse|mice -> 1 mouse, 2 |mouse|mice -> 2 mice
 * 1 sheep -> 1 sheep, 2 sheep -> 2 sheep
 */
function countNoun(count: number, nounForms: string): string {
    const parts = nounForms.split('|');
    let stem = '', sg = '', pl = '';
    if (parts.length === 1) {
        [stem] = parts;
    } else if (parts.length === 2) {
        [stem, pl] = parts;
    } else if (parts.length === 3) {
        [stem, sg, pl] = parts;
    } else {
        throw new Error(`Invalid noun specification: ${nounForms} (must contain max. 2 |)`);
    }
    const noun = count === 1 ? stem + sg : stem + pl;
    return `${count} ${noun}`;
}

/** Capitalize the first letter of `text` */
function capital(text: string): string {
    return text.replace(/^\w/, char => char.toUpperCase());
}

