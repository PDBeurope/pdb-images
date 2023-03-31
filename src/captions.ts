// Saving images, states, and captions

import { chainLabel, ModifiedResidueInfo } from './helpers/helpers';
import { EntityInfo, LigandInstanceInfo } from './helpers/structure-info';


export type ViewType = 'front' | 'side' | 'top' | undefined

export interface ImageSpec {
    /** File name or path (not necessarily full name, there might be implicit suffix, because of reasons) */
    filename: string,
    /** Alternative description for HTML <img> element */
    alt: string,
    /** Image caption, possibly with HTML formatting */
    description: string,
    /** Image caption, plain-text */
    clean_description: string,
    /** PDB or AlphaFoldDB identifier*/
    _entry_id: string,
    /** View direction */
    _view: ViewType,
    /** Location of the image in a hierarchy, e.g. ["entity", "1", "database", "CATH", "2.40.128.20"]. Use [] to keep flat hierarchy. */
    _section: string[],
    /** Any extra metadata that should get into the final caption files.  */
    _extras?: any,
}


export namespace Captions {
    const UL_ = "<ul class='image_legend_ul'>", _UL = '</ul>';
    const LI_ = "<li class='image_legend_li'>", _LI = '</li>';
    const B_ = "<span class='highlight'>", _B = '</span>';

    export interface StructureContext {
        pdbId: string,
        /** Assembly identifier (e.g. '1', '2'), or `null` if this is the deposited model */
        assemblyId: string | null,
        entityNames: { [entityId: number]: string[] },
        entityInfo: EntityInfo,
    }

    export function forEntryOrAssembly(context: StructureContext & { isPreferredAssembly: boolean, nModels: number, coloring: 'chains' | 'entities', view: ViewType }): ImageSpec {
        const { pdbId, assemblyId, isPreferredAssembly, nModels, coloring, entityInfo, view } = context;
        const colorClause = coloring === 'chains' ? 'by chain' : 'by chemically distinct molecules';
        const modelClause = nModels > 1 ? `ensemble of ${nModels} models` : '';
        const description = new TextBuilding.Builder();
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
            alt: new TextBuilding.Builder().push('PDB entry', pdbId, 'coloured', colorClause, ',', modelClause, ',', viewPhrase(view), '.').buildText(),
            description: description.buildText(),
            clean_description: description.buildPlainText(),
            _entry_id: pdbId,
            _view: view,
            _section: assemblyId ? ['assembly', assemblyId] : ['entry', 'all'],
            _extras: assemblyId ? { 'preferred': isPreferredAssembly } : undefined,
        };
    }

    export function forBFactor(context: { pdbId: string, view: ViewType }): ImageSpec {
        const { pdbId, view } = context;
        const description = new TextBuilding.Builder();
        description.push('The deposited structure of PDB entry', B_, pdbId, _B, 'coloured by B-factor values', ',', viewPhrase(view), '.');
        description.push('The macromolecules are shown in backbone representation. The thickness reflects the B-factor values (thin = low, thick = high). The colour varies from blue to red corresponding to a B-factor range of 0 to 100 square angstroms.');
        return {
            filename: `${pdbId}_bfactor${viewSuffix(view)}`,
            alt: new TextBuilding.Builder().push('B-factors for PDB entry', pdbId, ',', viewPhrase(view), '.').buildText(),
            description: description.buildText(),
            clean_description: description.buildPlainText(),
            _entry_id: pdbId,
            _view: view,
            _section: ['entry', 'bfactor'],
        };
    }

    export function forGeometryValidation(context: { pdbId: string, view: ViewType }): ImageSpec {
        const { pdbId, view } = context;
        const description = new TextBuilding.Builder();
        description.push('The deposited structure of PDB entry', B_, pdbId, _B, 'coloured by geometry validation', ',', viewPhrase(view), '.');
        description.push('Residues are coloured by the number of geometry outliers: green – no outliers, yellow – one outlier yellow, orange – two outliers, red – three or more outliers.');
        return {
            filename: `${pdbId}_validation_geometry_deposited${viewSuffix(view)}`,
            alt: new TextBuilding.Builder().push('Geometry outliers in PDB entry', pdbId, ',', viewPhrase(view), '.').buildText(),
            description: description.buildText(),
            clean_description: description.buildPlainText(),
            _entry_id: pdbId,
            _view: view,
            _section: ['validation', 'geometry', 'deposited'],
        };
    }

    export function forPlddt(context: { afdbId: string, view: ViewType }): ImageSpec {
        const { afdbId, view } = context;
        const description = new TextBuilding.Builder();
        description.push('The predicted structure of', B_, afdbId, _B, 'coloured by pLDDT confidence score', ',', viewPhrase(view), '.');
        description.push('Residues are coloured by pLDDT values: dark blue – very high (90–100), light blue – confident (70–90), yellow – low (50–70), orange – very low (0–50).');
        return {
            filename: `${afdbId}_plddt${viewSuffix(view)}`,
            alt: new TextBuilding.Builder().push('Predicted structure of', afdbId, ',', viewPhrase(view), '.').buildText(),
            description: description.buildText(),
            clean_description: description.buildPlainText(),
            _entry_id: afdbId,
            _view: view,
            _section: ['entry', 'plddt'],
        };
    }

    export function forHighlightedEntity(context: StructureContext & { entityId: string, view: ViewType }): ImageSpec {
        const { pdbId, assemblyId, entityInfo, entityId, view } = context;
        const nCopies = entityInfo[entityId].chains.length;
        const name = entityName(context, entityId);
        const description = new TextBuilding.Builder();
        description.push(structurePhrase(context), 'of PDB entry', B_, pdbId, _B,
            'contains', countNoun(nCopies, 'cop|y|ies'), 'of', B_, name, _B, '.',
            capital(viewPhrase(view)), '.');
        return {
            filename: `${pdbId}_entity_${entityId}${viewSuffix(view)}`,
            alt: new TextBuilding.Builder().push(name, 'in PDB entry', pdbId, ',',
                (assemblyId ? `assembly ${assemblyId}` : ''), ',', viewPhrase(view), '.').buildText(),
            description: description.buildText(),
            clean_description: description.buildPlainText(),
            _entry_id: pdbId,
            _view: view,
            _section: ['entity', entityId],
        };
    }

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
        const description = new TextBuilding.Builder();
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

    export function forLigandEnvironment(context: StructureContext & { ligandInfo: LigandInstanceInfo, view: ViewType }): ImageSpec {
        const { pdbId, ligandInfo, view } = context;
        const nCopies = ligandInfo.nInstancesInEntry;
        const name = entityName(context, ligandInfo.entityId);
        const description = new TextBuilding.Builder();
        description.push('The binding environment for', (nCopies === 1 ? '' : 'an instance of'), B_, ligandInfo.compId, `(${name})`, _B,
            'in PDB entry', B_, pdbId, _B, ',',
            'chain', B_, chainLabel(ligandInfo.chainId, ligandInfo.authChainId), _B, '.',
            capital(viewPhrase(view)), '.',
            'There', (nCopies === 1 ? 'is' : 'are'), countNoun(nCopies, 'cop|y|ies'), 'of', B_, ligandInfo.compId, _B, 'in the deposited model', '.');
        return {
            filename: `${pdbId}_ligand_${ligandInfo.compId}${viewSuffix(view)}`,
            alt: new TextBuilding.Builder().push('The binding environment for', (nCopies === 1 ? '' : 'an instance of'), ligandInfo.compId, 'in PDB entry', pdbId, ',',
                viewPhrase(view), '.').buildText(),
            description: description.buildText(),
            clean_description: description.buildPlainText(),
            _entry_id: pdbId,
            _view: view,
            _section: ['entry', 'ligands', ligandInfo.compId],
            _extras: { 'entity': ligandInfo.entityId, 'number_of_instances': ligandInfo.nInstancesInEntry },
        };
    }

    export function forModifiedResidue(context: StructureContext & { modresInfo: ModifiedResidueInfo, view: ViewType }): ImageSpec {
        const { pdbId, assemblyId, modresInfo, view } = context;
        const assemblyPrefix = assemblyId ? `assembly-${assemblyId}` : 'entry';
        const nCopies = modresInfo.nInstances;
        const description = new TextBuilding.Builder();
        description.push(structurePhrase(context), 'of PDB entry', B_, pdbId, _B,
            'contains', countNoun(nCopies, 'instance|s'), 'of modified residue', B_, modresInfo.compId, `(${modresInfo.compName})`, _B, '.',
            capital(viewPhrase(view)), '.');
        return {
            filename: `${pdbId}_modres_${modresInfo.compId}${viewSuffix(view)}`,
            alt: new TextBuilding.Builder().push('Modified residue', modresInfo.compId, 'in PDB entry', pdbId, ',',
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

    /** Return a word like 'homo-tetramer' or 'hetero-20-mer', based on the number of polymeric chains. */
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

    /** Return a word like 'tetramer' or '20-mer', based on the number of polymeric chains. */
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

/** Capitalize first letter of the text */
function capital(text: string) {
    return text.replace(/^\w/, char => char.toUpperCase());
}


namespace TextBuilding {
    /** Helper class for building text. Automatically deals with puctuation (e.g. remove comma after last list item if a period follows), spaces, and HTML tags */
    export class Builder {
        private readonly chunks: string[] = [];
        /** Add more text to the builder. Each chunk can be: word, more words, single punctuation character (,;-:.), or single HTML tag */
        push(...chunks: string[]) {
            this.chunks.push(...chunks);
            return this;
        }
        /** Return the built text, including HTML tags. */
        buildText() {
            return buildText(this.chunks, true);
        }
        /** Return the built text, without HTML tags. */
        buildPlainText() {
            return buildText(this.chunks, false);
        }
    }

    function buildText(chunks: string[], keepHTML: boolean): string {
        if (!keepHTML) {
            chunks = chunks.filter(s => !isTag(s));
        }
        let result: string[] = [];
        let previous = undefined;
        for (const next of solvePunctuation(chunks)) {
            if (needsSpace(previous, next)) {
                result.push(' ');
                result.push(next);
                previous = !isTag(next) ? next : undefined;
            } else {
                result.push(next);
                previous = !isTag(next) ? next : previous;
            }
        }
        result = result.map(s => s === '-' ? '–' : s);
        return result.join('');
    }
    function solvePunctuation(chunks: string[]): string[] {
        const result: string[] = [];
        let lastPunctIndex: number | undefined = undefined;
        for (const next of chunks) {
            if (next === '') {
                continue;
            } else if (isTag(next)) {
                result.push(next);
            } else if (isPunctuation(next)) {
                if (lastPunctIndex !== undefined) {
                    if (getPunctuationPriority(next)! >= getPunctuationPriority(result[lastPunctIndex])!) {
                        result[lastPunctIndex] = next;
                    }
                } else {
                    result.push(next);
                    lastPunctIndex = result.length - 1;
                }
            } else {
                result.push(next);
                lastPunctIndex = undefined;
            }
        }
        return result;
    }
    function isTag(chunk: string) {
        return chunk.startsWith('<') && chunk.endsWith('>');
    }
    function isTagStart(chunk: string) {
        return isTag(chunk) && !chunk.startsWith('</');
    }
    function isTagEnd(chunk: string) {
        return isTag(chunk) && chunk.startsWith('</');
    }
    const PUNCTUATION_PRIORITY = { ',': 1, ';': 2, '-': 3, ':': 4, '.': 5, '?': 5, '!': 5 };
    function getPunctuationPriority(chunk: string): number | undefined {
        return PUNCTUATION_PRIORITY[chunk as keyof typeof PUNCTUATION_PRIORITY];
    }
    function isPunctuation(chunk: string) {
        return getPunctuationPriority(chunk) !== undefined;
    }
    function needsSpace(first?: string, second?: string) {
        if (first === undefined || second === undefined) return false;
        if (isTag(first) && isTag(second)) return false;
        if (isTagStart(first) || isTagEnd(second)) return false;
        if (isPunctuation(second) && second !== '-') return false;
        return true;
    }
}