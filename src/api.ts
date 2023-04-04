import { warn } from './helpers/helpers';


export class PDBeAPI {
    constructor(public readonly baseUrl: string, public readonly noApi: boolean = false) { }

    private async get(url: string) {
        if (this.noApi) return {};
        const response = await fetch(url);
        if (response.status === 404) return {}; // PDBe API returns 404 in some cases (e.g. when there are no modified residues)
        if (!response.ok) throw new Error(`API call failed with code ${response.status} (${url})`);
        const text = await response.text();
        return JSON.parse(text);
    }
    async getEntityNames(pdbId: string) {
        const url = `${this.baseUrl}/pdb/entry/molecules/${pdbId}`;
        const json = await this.get(url);
        const names: { [entityId: number]: string[] } = {};
        for (const record of json[pdbId] ?? []) {
            names[record.entity_id] = record.molecule_name ?? [];
        }
        return names;
    }
    async getAssemblies(pdbId: string): Promise<AssemblyRecord[]> {
        const url = `${this.baseUrl}/pdb/entry/summary/${pdbId}`;
        const json = await this.get(url);
        const assemblies = [];
        for (const record of json[pdbId] ?? []) {
            for (const assembly of record.assemblies) {
                assemblies.push(assembly);
            }
        }
        return assemblies;
    }
    async getPreferredAssembly(pdbId: string): Promise<AssemblyRecord | undefined> {
        // The preferred assembly is not always 1 (e.g. in 1l7c the pref. ass. is 4)
        if (this.noApi) return { assembly_id: '1', form: '?', preferred: true, name: '?' };
        const assemblies = await this.getAssemblies(pdbId);
        if (assemblies.length === 0) {
            return undefined;
        }
        const preferred = assemblies.filter(ass => ass.preferred);
        if (preferred.length === 0) {
            warn(`PDB entry ${pdbId} has no preferred assembly`);
            return assemblies[0];
        }
        if (preferred.length > 1) {
            warn(`PDB entry ${pdbId} has more than one preferred assembly`);
        }
        return preferred[0];
    }
    async getModifiedResidue(pdbId: string) {
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
    async getSiftsMappings(pdbId: string): Promise<{ [source in SiftsSource]: { [family: string]: DomainRecord[] } }> {
        const promiseProtein = this.get(`${this.baseUrl}/mappings/${pdbId}`);
        const promiseNucleic = this.get(`${this.baseUrl}/nucleic_mappings/${pdbId}`);
        const jsonProtein = await promiseProtein;
        const jsonNucleic = await promiseNucleic;
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
    private static extractDomainMappings(mappings: any[], source: SiftsSource, family: string, familyName: string) {
        const result: { [domainId: string]: DomainRecord } = {};
        let domainCounter = 0;
        for (const mapping of mappings) {
            const domainId = mapping.domain ?? mapping.scop_id ?? `${family}_${++domainCounter}`;
            const existingDomain = result[domainId];
            const chunk: DomainChunkRecord = {
                entity_id: mapping.entity_id,
                asymID: mapping.struct_asym_id,
                chain: mapping.chain_id,
                CIFstart: mapping.start.residue_number,
                CIFend: mapping.end.residue_number,
                segment: existingDomain ? existingDomain.chunks.length + 1 : 1,
            };
            if (chunk.CIFstart > chunk.CIFend) [chunk.CIFstart, chunk.CIFend] = [chunk.CIFend, chunk.CIFstart]; // you never know with the PDBe API
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
    pdbeStructureQualityReportPrefix() {
        const url = `${this.baseUrl}/validation/residuewise_outlier_summary/entry/`;
        return url;
    }
}

/** Represents one instance of a modified residue */
export interface ModifiedResidueRecord {
    entityId: number,
    labelChainId: string,
    authChainId: string,
    residueNumber: number,
    compoundId: string,
    compoundName: string,
}

interface AssemblyRecord {
    /** Usually '1', '2' etc. */
    assembly_id: string,
    /** Usually 'homo' or 'hetero' */
    form: string,
    preferred: boolean,
    /** Usually 'monomer', 'tetramer' etc. */
    name: string,
}

const SIFTS_SOURCES = ['CATH', 'Pfam', 'Rfam', 'SCOP'] as const;
export type SiftsSource = typeof SIFTS_SOURCES[number];

export interface DomainRecord {
    id: string,
    source: string
    family: string,
    familyName: string,
    chunks: DomainChunkRecord[],
}

/** Attribute names same as in the original process, therefore no consistency */
interface DomainChunkRecord {
    entity_id: string,
    /** label_asym_id */
    asymID: string,
    /** auth_asym_id */
    chain: string,
    /** label_seq_id of the first residue */
    CIFstart: number,
    /** label_seq_id of the last residue */
    CIFend: number,
    /** No idea what this was supposed to mean in the original process (probably segment no. from the API before cutting into smaller segments by removing missing residues) */
    segment: number
}
