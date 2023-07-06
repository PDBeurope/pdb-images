/**
 * Copyright (c) 2023 EMBL - European Bioinformatics Institute, licensed under Apache 2.0, see LICENSE file for more info.
 *
 * @author Adam Midlik <midlik@gmail.com>
 */

import { EntityInfo } from '../../helpers/structure-info';
import { Captions } from '../captions';


const COMMON_CONTEXT = {
    entryId: '1hda',
    assemblyId: undefined,
    isPreferredAssembly: false,
    entityInfo: {
        '1': { description: 'HEMOGLOBIN (DEOXY) (ALPHA CHAIN)', type: 'polymer', chains: [0, 1] as any, index: 0 },
        '2': { description: 'HEMOGLOBIN (DEOXY) (BETA CHAIN)', type: 'polymer', chains: [2, 3] as any, index: 1 },
        '3': { description: 'PROTOPORPHYRIN IX CONTAINING FE', type: 'non-polymer', chains: [4, 5, 6, 7] as any, index: 2 },
        '4': { description: 'water', type: 'water', chains: [8] as any, index: 3 }
    } as EntityInfo,
    entityNames: { '1': ['Hemoglobin alpha chain'], '2': ['Hemoglobin beta chain', 'blablabla'], '3': [] },
    nModels: 1,
    view: undefined
};


describe('captions', () => {
    it('entry', () => {
        expect(Captions.forEntryOrAssembly({ ...COMMON_CONTEXT, coloring: 'chains' })).toEqual({
            _entry_id: '1hda',
            _extras: undefined,
            _section: ['entry', 'all'],
            _view: undefined,
            alt: 'PDB entry 1hda coloured by chain.',
            clean_description: 'The deposited structure of PDB entry 1hda coloured by chain. This structure contains: 2 copies of Hemoglobin alpha chain; 2 copies of Hemoglobin beta chain; 4 copies of PROTOPORPHYRIN IX CONTAINING FE; 1 copy of water.',
            description: "The deposited structure of PDB entry <span class='highlight'>1hda</span> coloured by chain. This structure contains: <ul class='image_legend_ul'><li class='image_legend_li'>2 copies of <span class='highlight'>Hemoglobin alpha chain</span>;</li> <li class='image_legend_li'>2 copies of <span class='highlight'>Hemoglobin beta chain</span>;</li> <li class='image_legend_li'>4 copies of <span class='highlight'>PROTOPORPHYRIN IX CONTAINING FE</span>;</li> <li class='image_legend_li'>1 copy of <span class='highlight'>water</span>.</li></ul>",
            filename: '1hda_deposited_chain',
        });
    });

    it('assembly', () => {
        expect(Captions.forEntryOrAssembly({ ...COMMON_CONTEXT, assemblyId: '1', coloring: 'entities', view: 'side' })).toEqual({
            _entry_id: '1hda',
            _extras: { preferred: false },
            _section: ['assembly', '1'],
            _view: 'side',
            alt: 'Hetero-tetrameric assembly 1 of PDB entry 1hda coloured by chemically distinct molecules, side view.',
            clean_description: 'Hetero-tetrameric assembly 1 of PDB entry 1hda coloured by chemically distinct molecules, side view. This structure contains: 2 copies of Hemoglobin alpha chain; 2 copies of Hemoglobin beta chain; 4 copies of PROTOPORPHYRIN IX CONTAINING FE; 1 copy of water.',
            description: "Hetero-tetrameric assembly 1 of PDB entry <span class='highlight'>1hda</span> coloured by chemically distinct molecules, side view. This structure contains: <ul class='image_legend_ul'><li class='image_legend_li'>2 copies of <span class='highlight'>Hemoglobin alpha chain</span>;</li> <li class='image_legend_li'>2 copies of <span class='highlight'>Hemoglobin beta chain</span>;</li> <li class='image_legend_li'>4 copies of <span class='highlight'>PROTOPORPHYRIN IX CONTAINING FE</span>;</li> <li class='image_legend_li'>1 copy of <span class='highlight'>water</span>.</li></ul>",
            filename: '1hda_assembly_1_chemically_distinct_molecules_side',
        });
    });

    it('bfactor', () => {
        expect(Captions.forBFactor({ ...COMMON_CONTEXT, view: undefined })).toEqual({
            _entry_id: '1hda',
            _extras: undefined,
            _section: ['entry', 'bfactor'],
            _view: undefined,
            alt: 'B-factors for PDB entry 1hda.',
            clean_description: 'The deposited structure of PDB entry 1hda coloured by B-factor values. The macromolecules are shown in backbone representation. The thickness reflects the B-factor values (thin = low, thick = high). The colour varies from blue to red corresponding to a B-factor range of 0 to 100 square angstroms.',
            description: "The deposited structure of PDB entry <span class='highlight'>1hda</span> coloured by B-factor values. The macromolecules are shown in backbone representation. The thickness reflects the B-factor values (thin = low, thick = high). The colour varies from blue to red corresponding to a B-factor range of 0 to 100 square angstroms.",
            filename: '1hda_bfactor',
        });
    });

    it('validation', () => {
        expect(Captions.forGeometryValidation({ ...COMMON_CONTEXT, view: undefined })).toEqual({
            _entry_id: '1hda',
            _extras: undefined,
            _section: ['validation', 'geometry', 'deposited'],
            _view: undefined,
            alt: 'Geometry outliers in PDB entry 1hda.',
            clean_description: 'The deposited structure of PDB entry 1hda coloured by geometry validation. Residues are coloured by the number of geometry outliers: green – no outliers, yellow – one outlier yellow, orange – two outliers, red – three or more outliers.',
            description: "The deposited structure of PDB entry <span class='highlight'>1hda</span> coloured by geometry validation. Residues are coloured by the number of geometry outliers: green – no outliers, yellow – one outlier yellow, orange – two outliers, red – three or more outliers.",
            filename: '1hda_validation_geometry_deposited',
        });
    });

    it('plddt', () => {
        expect(Captions.forPlddt({ ...COMMON_CONTEXT, afdbId: 'AF-A0A1U8FD60', view: undefined })).toEqual({
            _entry_id: 'AF-A0A1U8FD60',
            _extras: undefined,
            _section: ['entry', 'plddt'],
            _view: undefined,
            alt: 'Predicted structure of AF-A0A1U8FD60.',
            clean_description: 'The predicted structure of AF-A0A1U8FD60 coloured by pLDDT confidence score. Residues are coloured by pLDDT values: dark blue – very high (90–100), light blue – confident (70–90), yellow – low (50–70), orange – very low (0–50).',
            description: "The predicted structure of <span class='highlight'>AF-A0A1U8FD60</span> coloured by pLDDT confidence score. Residues are coloured by pLDDT values: dark blue – very high (90–100), light blue – confident (70–90), yellow – low (50–70), orange – very low (0–50).",
            filename: 'AF-A0A1U8FD60_plddt',
        });
    });

    it('entity', () => {
        expect(Captions.forHighlightedEntity({ ...COMMON_CONTEXT, entityId: '2', view: 'front' })).toEqual({
            _entry_id: '1hda',
            _extras: undefined,
            _section: ['entity', '2'],
            _view: 'front',
            alt: 'Hemoglobin beta chain in PDB entry 1hda, front view.',
            clean_description: 'The deposited structure of PDB entry 1hda contains 2 copies of Hemoglobin beta chain. Front view.',
            description: "The deposited structure of PDB entry <span class='highlight'>1hda</span> contains 2 copies of <span class='highlight'>Hemoglobin beta chain</span>. Front view.",
            filename: '1hda_entity_2_front',
        });
    });

    it('domain', () => {
        expect(Captions.forDomain({
            ...COMMON_CONTEXT, entityId: '2',
            source: 'CATH', familyId: '1.10.490.10', familyName: 'Globin-like', totalCopies: 2, shownCopies: 1, outOfRangeCopies: 0, chainId: 'B', authChainId: 'B', view: 'front'
        })).toEqual({
            _entry_id: '1hda',
            _extras: undefined,
            _section: ['entity', '2', 'database', 'CATH', '1.10.490.10'],
            _view: 'front',
            alt: 'The deposited structure of PDB entry 1hda contains 2 copies of CATH domain 1.10.490.10 (Globin-like) in Hemoglobin beta chain. Showing 1 copy in chain B. Front view.',
            clean_description: 'The deposited structure of PDB entry 1hda contains 2 copies of CATH domain 1.10.490.10 (Globin-like) in Hemoglobin beta chain. Showing 1 copy in chain B. Front view.',
            description: "The deposited structure of PDB entry <span class='highlight'>1hda</span> contains 2 copies of CATH domain <span class='highlight'>1.10.490.10 (Globin-like)</span> in <span class='highlight'>Hemoglobin beta chain</span>. Showing 1 copy in chain <span class='highlight'>B</span>. Front view.",
            filename: '1hda_2_B_CATH_1.10.490.10_front',
        });
    });

    it('ligand', () => {
        expect(Captions.forLigandEnvironment({ ...COMMON_CONTEXT, ligandInfo: { compId: 'HEM', entityId: '3', description: 'PROTOPORPHYRIN IX CONTAINING FE', chainId: 'E', authChainId: 'A', nInstancesInEntry: 4 } })).toEqual({
            _entry_id: '1hda',
            _extras: { entity: '3', number_of_instances: 4 },
            _section: ['entry', 'ligands', 'HEM'],
            _view: undefined,
            alt: 'The binding environment for an instance of HEM in PDB entry 1hda.',
            clean_description: 'The binding environment for an instance of HEM (PROTOPORPHYRIN IX CONTAINING FE) in PDB entry 1hda, chain E [auth A]. There are 4 copies of HEM in the deposited model.',
            description: "The binding environment for an instance of <span class='highlight'>HEM (PROTOPORPHYRIN IX CONTAINING FE)</span> in PDB entry <span class='highlight'>1hda</span>, chain <span class='highlight'>E [auth A]</span>. There are 4 copies of <span class='highlight'>HEM</span> in the deposited model.",
            filename: '1hda_ligand_HEM',
        });
    });

    it('modres', () => {
        expect(Captions.forModifiedResidue({ ...COMMON_CONTEXT, assemblyId: '4', modresInfo: { compId: 'MSE', compName: 'SELENOMETHIONINE', nInstances: 10, instances: undefined as any }, view: 'top' })).toEqual({
            _entry_id: '1hda',
            _extras: undefined,
            _section: ['entry', 'mod_res', 'MSE'],
            _view: 'top',
            alt: 'Modified residue MSE in PDB entry 1hda, assembly 4, top view.',
            clean_description: 'Hetero-tetrameric assembly 4 of PDB entry 1hda contains 10 instances of modified residue MSE (SELENOMETHIONINE). Top view.',
            description: "Hetero-tetrameric assembly 4 of PDB entry <span class='highlight'>1hda</span> contains 10 instances of modified residue <span class='highlight'>MSE (SELENOMETHIONINE)</span>. Top view.",
            filename: '1hda_modres_MSE_top',
        });
    });
});
