/**
 * Copyright (c) 2023 EMBL - European Bioinformatics Institute, licensed under Apache 2.0, see LICENSE file for more info.
 *
 * @author Adam Midlik <midlik@gmail.com>
 */

import fs from 'fs';
import { getLogger } from './helpers/logging';
import { safePromise } from './helpers/helpers';


const logger = getLogger(module);

/** Client for access to PDBe REST API */
export class PDBeAPI {
    /** API base URL, without trailing slash, after which route and entry ID can be appended, e.g. 'https://www.ebi.ac.uk/pdbe/api' */
    public readonly baseUrl: string;
    /** If `true`, this is a mock API client which returns correct types but without any specific data. */
    public readonly offline: boolean;

    /** Create a client accessing API at `baseUrl` (like 'https://www.ebi.ac.uk/pdbe/api').
     * If `offline`, create a mock client which returns correct types but without any specific data. */
    constructor(baseUrl: string, offline: boolean = false) {
        this.baseUrl = (baseUrl[baseUrl.length - 1] === '/') ? baseUrl.substring(0, baseUrl.length - 1) : baseUrl;
        this.offline = offline;
    }

    /** Fetch contents of `url` ('http://...', 'https://...', 'file://...')
     * and return as parsed JSON. */
    private async get(url: string): Promise<any> {
        if (this.offline) return {};
        if (url.startsWith('file://')) {
            const text = fs.readFileSync(url.substring('file://'.length), { encoding: 'utf8' });
            return JSON.parse(text);
        } else {
            const response = await fetch(url);
            if (response.status === 404) return {}; // PDBe API returns 404 in some cases (e.g. when there are no modified residues)
            if (!response.ok) throw new Error(`API call failed with code ${response.status} (${url})`);
            const text = await response.text();
            return JSON.parse(text);
        }
    }

    /** Get names of entities within a PDB entry. */
    async getEntityNames(pdbId: string): Promise<{ [entityId: number]: string[] }> {
        const url = `${this.baseUrl}/pdb/entry/molecules/${pdbId}`;
        const json = await this.get(url);
        const names: { [entityId: number]: string[] } = {};
        for (const record of json[pdbId] ?? []) {
            names[record.entity_id] = record.molecule_name ?? [];
        }
        return names;
    }

    /** Get list of assemblies for a PDB entry. */
    async getAssemblies(pdbId: string): Promise<AssemblyRecord[]> {
        const url = `${this.baseUrl}/pdb/entry/summary/${pdbId}`;
        const json = await this.get(url);
        const assemblies: AssemblyRecord[] = [];
        for (const record of json[pdbId] ?? []) {
            for (const assembly of record.assemblies) {
                assemblies.push({
                    assemblyId: assembly.assembly_id,
                    form: assembly.form,
                    preferred: assembly.preferred,
                    name: assembly.name,
                });
            }
        }
        return assemblies;
    }

    /** Get the preferred assembly for a PDB entry.
     * If initialized with `offline`, return assembly with ID '1' and all fields filled with '?'. */
    async getPreferredAssembly(pdbId: string): Promise<AssemblyRecord | undefined> {
        // The preferred assembly is not always 1 (e.g. in 1l7c the pref. ass. is 4)
        if (this.offline) return { assemblyId: '1', form: '?', preferred: true, name: '?' };
        const assemblies = await this.getAssemblies(pdbId);
        if (assemblies.length === 0) {
            return undefined;
        }
        const preferred = assemblies.filter(ass => ass.preferred);
        if (preferred.length === 0) {
            logger.warn(`PDB entry ${pdbId} has no preferred assembly. Using the first assembly instead.`);
            return assemblies[0];
        }
        if (preferred.length > 1) {
            logger.warn(`PDB entry ${pdbId} has more than one preferred assembly. Only the first one will be used.`);
        }
        return preferred[0];
    }

    /** Get list of instances of modified residues within a PDB entry. */
    async getModifiedResidue(pdbId: string): Promise<ModifiedResidueRecord[]> {
        const url = `${this.baseUrl}/pdb/entry/modified_AA_or_NA/${pdbId}`;
        const json = await this.get(url);
        const result: ModifiedResidueRecord[] = [];
        for (const record of json[pdbId] ?? []) {
            result.push({
                entityId: record.entity_id,
                labelChainId: record.struct_asym_id,
                authChainId: record.chain_id,
                residueNumber: record.residue_number,
                compoundId: record.chem_comp_id,
                compoundName: record.chem_comp_name,
            });
        }
        return result;
    }

    /** Get list of instances of SIFTS domains within a PDB entry,
     * sorted by source (CATH, Pfam, Rfam, SCOP) and family (e.g. 1.10.630.10, PF00067). */
    async getSiftsMappings(pdbId: string): Promise<{ [source in SiftsSource]: { [family: string]: DomainRecord[] } }> {
        const promiseProtein = safePromise(() => this.get(`${this.baseUrl}/mappings/${pdbId}`));
        const promiseNucleic = safePromise(() => this.get(`${this.baseUrl}/nucleic_mappings/${pdbId}`));
        const jsonProtein = await promiseProtein.result();
        const jsonNucleic = await promiseNucleic.result();
        const entryDataProtein = jsonProtein[pdbId] ?? {};
        const entryDataNucleic = jsonNucleic[pdbId] ?? {};
        const entryData = { ...entryDataProtein, ...entryDataNucleic };

        const result = {} as { [source in SiftsSource]: { [family: string]: DomainRecord[] } };
        for (const source of SIFTS_SOURCES) {
            result[source] = {};
            const sourceData = entryData[source] ?? {};
            for (const family of Object.keys(sourceData).sort()) {
                const familyName = sourceData[family].identifier;
                const mappings = sourceData[family].mappings;
                result[source][family] = PDBeAPI.extractDomainMappings(mappings, source, family, familyName);
            }
        }
        return result;
    }

    /** Helper function to convert a domain mapping (describes one domain)
     * from PDBeAPI format to a `DomainRecord`. */
    private static extractDomainMappings(mappings: any[], source: SiftsSource, family: string, familyName: string): DomainRecord[] {
        const result: { [domainId: string]: DomainRecord } = {};
        let domainCounter = 0;
        for (const mapping of mappings) {
            const domainId = mapping.domain ?? mapping.scop_id ?? `${family}_${++domainCounter}`;
            const existingDomain = result[domainId];
            const chunk: DomainChunkRecord = {
                entityId: String(mapping.entity_id),
                chainId: mapping.struct_asym_id,
                authChainId: mapping.chain_id,
                startResidue: mapping.start.residue_number,
                endResidue: mapping.end.residue_number,
                segment: existingDomain ? existingDomain.chunks.length + 1 : 1,
            };
            if (chunk.startResidue > chunk.endResidue) [chunk.startResidue, chunk.endResidue] = [chunk.endResidue, chunk.startResidue]; // you never know with the PDBe API
            if (existingDomain) {
                existingDomain.chunks.push(chunk);
            } else {
                result[domainId] = {
                    id: domainId,
                    source: source,
                    family: family,
                    familyName: familyName,
                    chunks: [chunk],
                };
            }
        }
        return Object.values(result).sort((a, b) => a.id < b.id ? -1 : 1);
    }

    /** Get a URL prefix (without the PDBID argument) for PDBe structure quality report,
     * or `undefined` if initialized with `offline`. */
    pdbeStructureQualityReportPrefix(): string | undefined {
        if (this.offline) return undefined;
        else return `${this.baseUrl}/validation/residuewise_outlier_summary/entry/`;
    }
}

export type PDBeAPIMethod = 'pdbeStructureQualityReportPrefix' | 'getEntityNames' | 'getAssemblies' | 'getPreferredAssembly' | 'getModifiedResidue' | 'getSiftsMappings'
export type PDBeAPIReturn<key extends PDBeAPIMethod> = Awaited<ReturnType<InstanceType<typeof PDBeAPI>[key]>>


/** Represents one instance of a modified residue. */
export interface ModifiedResidueRecord {
    entityId: number,
    labelChainId: string,
    authChainId: string,
    residueNumber: number,
    /** Compound code, e.g. 'MSE' */
    compoundId: string,
    /** Full compound code, e.g. 'Selenomethionine' */
    compoundName: string,
}

/** Represents one assembly of a PDB entry. */
interface AssemblyRecord {
    /** Assembly ID, usually '1', '2' etc. */
    assemblyId: string,
    /** Usually 'homo' or 'hetero' */
    form: string,
    /** Flags if this is the preferred assembly (should be only one for each PDB entry) */
    preferred: boolean,
    /** Assembly description like 'monomer', 'tetramer' etc. */
    name: string,
}

/** List of supported SIFTS source databases */
const SIFTS_SOURCES = ['CATH', 'Pfam', 'Rfam', 'SCOP'] as const;

/** SIFTS source database */
export type SiftsSource = typeof SIFTS_SOURCES[number];

/**  */
export interface DomainRecord {
    id: string,
    source: string
    family: string,
    familyName: string,
    chunks: DomainChunkRecord[],
}

/** Represents one contiguous residue range forming a domain */
interface DomainChunkRecord {
    /** label_entity_id */
    entityId: string,
    /** label_asym_id */
    chainId: string,
    /** auth_asym_id */
    authChainId: string,
    /** label_seq_id of the first residue */
    startResidue: number,
    /** label_seq_id of the last residue */
    endResidue: number,
    /** No idea what this was supposed to mean in the original process (probably segment number
     * from the API before cutting into smaller segments by removing missing residues) */
    segment: number
}
