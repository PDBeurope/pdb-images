/**
 * Copyright (c) 2023 EMBL - European Bioinformatics Institute, licensed under Apache 2.0, see LICENSE file for more info.
 *
 * @author Adam Midlik <midlik@gmail.com>
 */

import { PDBeAPI } from '../api';
import { checkMissingFiles, getExpectedFiles } from '../expected-files';


const API = new PDBeAPI('file://./test_data/api');


describe('expected-filenames', () => {
    it('getExpectedFiles - defaults', async () => {
        expect(await getExpectedFiles({ entry_id: '1tqn', mode: 'pdb', type: ['all'], view: 'auto', size: [{ width: 800, height: 800 }] }, API))
            .toEqual([
                '1tqn_filelist',
                '1tqn.json',
                '1tqn_deposited_chain_front.caption.json',
                '1tqn_deposited_chain_front.molj',
                '1tqn_deposited_chain_front_image-800x800.png',
                '1tqn_deposited_chain_side.caption.json',
                '1tqn_deposited_chain_side.molj',
                '1tqn_deposited_chain_side_image-800x800.png',
                '1tqn_deposited_chain_top.caption.json',
                '1tqn_deposited_chain_top.molj',
                '1tqn_deposited_chain_top_image-800x800.png',
                '1tqn_deposited_chemically_distinct_molecules_front.caption.json',
                '1tqn_deposited_chemically_distinct_molecules_front.molj',
                '1tqn_deposited_chemically_distinct_molecules_front_image-800x800.png',
                '1tqn_deposited_chemically_distinct_molecules_side.caption.json',
                '1tqn_deposited_chemically_distinct_molecules_side.molj',
                '1tqn_deposited_chemically_distinct_molecules_side_image-800x800.png',
                '1tqn_deposited_chemically_distinct_molecules_top.caption.json',
                '1tqn_deposited_chemically_distinct_molecules_top.molj',
                '1tqn_deposited_chemically_distinct_molecules_top_image-800x800.png',
                '1tqn_assembly_1_chain_front.caption.json',
                '1tqn_assembly_1_chain_front.molj',
                '1tqn_assembly_1_chain_front_image-800x800.png',
                '1tqn_assembly_1_chain_side.caption.json',
                '1tqn_assembly_1_chain_side.molj',
                '1tqn_assembly_1_chain_side_image-800x800.png',
                '1tqn_assembly_1_chain_top.caption.json',
                '1tqn_assembly_1_chain_top.molj',
                '1tqn_assembly_1_chain_top_image-800x800.png',
                '1tqn_assembly_1_chemically_distinct_molecules_front.caption.json',
                '1tqn_assembly_1_chemically_distinct_molecules_front.molj',
                '1tqn_assembly_1_chemically_distinct_molecules_front_image-800x800.png',
                '1tqn_assembly_1_chemically_distinct_molecules_side.caption.json',
                '1tqn_assembly_1_chemically_distinct_molecules_side.molj',
                '1tqn_assembly_1_chemically_distinct_molecules_side_image-800x800.png',
                '1tqn_assembly_1_chemically_distinct_molecules_top.caption.json',
                '1tqn_assembly_1_chemically_distinct_molecules_top.molj',
                '1tqn_assembly_1_chemically_distinct_molecules_top_image-800x800.png',
                '1tqn_assembly_2_chain_front.caption.json',
                '1tqn_assembly_2_chain_front.molj',
                '1tqn_assembly_2_chain_front_image-800x800.png',
                '1tqn_assembly_2_chain_side.caption.json',
                '1tqn_assembly_2_chain_side.molj',
                '1tqn_assembly_2_chain_side_image-800x800.png',
                '1tqn_assembly_2_chain_top.caption.json',
                '1tqn_assembly_2_chain_top.molj',
                '1tqn_assembly_2_chain_top_image-800x800.png',
                '1tqn_assembly_2_chemically_distinct_molecules_front.caption.json',
                '1tqn_assembly_2_chemically_distinct_molecules_front.molj',
                '1tqn_assembly_2_chemically_distinct_molecules_front_image-800x800.png',
                '1tqn_assembly_2_chemically_distinct_molecules_side.caption.json',
                '1tqn_assembly_2_chemically_distinct_molecules_side.molj',
                '1tqn_assembly_2_chemically_distinct_molecules_side_image-800x800.png',
                '1tqn_assembly_2_chemically_distinct_molecules_top.caption.json',
                '1tqn_assembly_2_chemically_distinct_molecules_top.molj',
                '1tqn_assembly_2_chemically_distinct_molecules_top_image-800x800.png',
                '1tqn_entity_1_front.caption.json',
                '1tqn_entity_1_front.molj',
                '1tqn_entity_1_front_image-800x800.png',
                '1tqn_entity_1_side.caption.json',
                '1tqn_entity_1_side.molj',
                '1tqn_entity_1_side_image-800x800.png',
                '1tqn_entity_1_top.caption.json',
                '1tqn_entity_1_top.molj',
                '1tqn_entity_1_top_image-800x800.png',
                '1tqn_entity_2_front.caption.json',
                '1tqn_entity_2_front.molj',
                '1tqn_entity_2_front_image-800x800.png',
                '1tqn_entity_2_side.caption.json',
                '1tqn_entity_2_side.molj',
                '1tqn_entity_2_side_image-800x800.png',
                '1tqn_entity_2_top.caption.json',
                '1tqn_entity_2_top.molj',
                '1tqn_entity_2_top_image-800x800.png',
                '1tqn_1_A_CATH_1.10.630.10.caption.json',
                '1tqn_1_A_CATH_1.10.630.10.molj',
                '1tqn_1_A_CATH_1.10.630.10_image-800x800.png',
                '1tqn_1_A_Pfam_PF00067.caption.json',
                '1tqn_1_A_Pfam_PF00067.molj',
                '1tqn_1_A_Pfam_PF00067_image-800x800.png',
                '1tqn_1_A_SCOP_48265.caption.json',
                '1tqn_1_A_SCOP_48265.molj',
                '1tqn_1_A_SCOP_48265_image-800x800.png',
                '1tqn_ligand_HEM.caption.json',
                '1tqn_ligand_HEM.molj',
                '1tqn_ligand_HEM_image-800x800.png',
                '1tqn_bfactor.caption.json',
                '1tqn_bfactor.molj',
                '1tqn_bfactor_image-800x800.png',
                '1tqn_validation_geometry_deposited.caption.json',
                '1tqn_validation_geometry_deposited.molj',
                '1tqn_validation_geometry_deposited_image-800x800.png',
            ]);
    });

    it('getExpectedFiles - selected types, NMR', async () => {
        expect(await getExpectedFiles({ entry_id: '176d', mode: 'pdb', type: ['entry', 'validation', 'bfactor'], view: 'front', size: [{ width: 100, height: 75 }, { width: 400, height: 300 }] }, API))
            .toEqual([
                '176d_filelist',
                '176d.json',
                '176d_deposited_chain.caption.json',
                '176d_deposited_chain.molj',
                '176d_deposited_chain_image-100x75.png',
                '176d_deposited_chain_image-400x300.png',
                '176d_deposited_chemically_distinct_molecules.caption.json',
                '176d_deposited_chemically_distinct_molecules.molj',
                '176d_deposited_chemically_distinct_molecules_image-100x75.png',
                '176d_deposited_chemically_distinct_molecules_image-400x300.png',
                '176d_validation_geometry_deposited.caption.json',
                '176d_validation_geometry_deposited.molj',
                '176d_validation_geometry_deposited_image-100x75.png',
                '176d_validation_geometry_deposited_image-400x300.png',
            ]);
    });

    it('getExpectedFiles - modres', async () => {
        expect(await getExpectedFiles({ entry_id: '1hcj', mode: 'pdb', type: ['modres'], view: 'front', size: [{ width: 800, height: 800 }] }, API))
            .toEqual([
                '1hcj_filelist',
                '1hcj.json',
                '1hcj_modres_ABA.caption.json',
                '1hcj_modres_ABA.molj',
                '1hcj_modres_ABA_image-800x800.png',
                '1hcj_modres_GYS.caption.json',
                '1hcj_modres_GYS.molj',
                '1hcj_modres_GYS_image-800x800.png',
            ]);
    });

    it('getExpectedFiles - Alphafold', async () => {
        expect(await getExpectedFiles({ entry_id: 'AF-Q8W3K0-F1-model_v4', mode: 'alphafold', type: ['all'], view: 'auto', size: [{ width: 800, height: 800 }] }, API))
            .toEqual([
                'AF-Q8W3K0-F1-model_v4_filelist',
                'AF-Q8W3K0-F1-model_v4.json',
                'AF-Q8W3K0-F1-model_v4_plddt_front.caption.json',
                'AF-Q8W3K0-F1-model_v4_plddt_front.molj',
                'AF-Q8W3K0-F1-model_v4_plddt_front_image-800x800.png',
                'AF-Q8W3K0-F1-model_v4_plddt_side.caption.json',
                'AF-Q8W3K0-F1-model_v4_plddt_side.molj',
                'AF-Q8W3K0-F1-model_v4_plddt_side_image-800x800.png',
                'AF-Q8W3K0-F1-model_v4_plddt_top.caption.json',
                'AF-Q8W3K0-F1-model_v4_plddt_top.molj',
                'AF-Q8W3K0-F1-model_v4_plddt_top_image-800x800.png',
            ]);
    });

    it('checkMissingFiles - missing', async () => {
        checkMissingFiles('./test_data/dummy', [], 'dummy'); // just check if it does not throw
        checkMissingFiles('./test_data/dummy', ['sample.txt', 'sample.txt.gz'], 'dummy'); // just check if it does not throw
        expect(() => checkMissingFiles('./test_data/dummy', ['sample.txt', 'sample.txt.gz', 'non-existing-file.txt'], 'dummy')).toThrow();
        expect(() => checkMissingFiles('./test_data/dummy', ['sample.txt', 'sample.txt.gz', 'empty.txt'], 'dummy')).toThrow();
    });
});
