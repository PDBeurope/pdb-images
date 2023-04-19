import { PluginContext } from 'molstar/lib/commonjs/mol-plugin/context'; // this must be imported before ImageGenerator, otherwise fails (circular dependency?)

import { PluginStateSnapshotManager } from 'molstar/lib/commonjs/mol-plugin-state/manager/snapshots';
import { PDBeAPI } from '../api';
import { ImageSpec } from '../captions/captions';
import { ImageGenerator } from '../image-generator';
import { ImageType } from '../main';
import { TestingPdb, getTestingHeadlessPlugin, isImageBlank, isBorderBlank } from './_utils';
import { RawImageData } from 'molstar/lib/commonjs/mol-plugin/util/headless-screenshot';
import { loadPngToRaw } from '../image/resize';


PluginContext; // ensure PluginContext is imported before ImageGenerator

const TEST_TIMEOUT = 180_000; // ms


async function generateStates(pdbId: TestingPdb, imageTypes: ImageType[], views: 'front' | 'all' | 'auto', format: 'cif' | 'bcif', mode: 'pdb' | 'alphafold' = 'pdb') {
    const plugin = await getTestingHeadlessPlugin();
    try {
        const api = new PDBeAPI('file://./test_data/api');
        const states: { [filename: string]: PluginStateSnapshotManager.StateSnapshot } = {};
        const saveFunction = async (spec: ImageSpec) => { states[spec.filename] = await plugin.getStateSnapshot(); };
        const generator = new ImageGenerator(plugin, saveFunction, api, imageTypes, views);
        await generator.processAll(pdbId, `file://./test_data/structures/${pdbId}.${format}`, format, mode);
        return states;
    } finally {
        plugin.dispose();
    }
}

async function generateImages(pdbId: TestingPdb, imageTypes: ImageType[], views: 'front' | 'all' | 'auto', format: 'cif' | 'bcif', mode: 'pdb' | 'alphafold' = 'pdb') {
    const plugin = await getTestingHeadlessPlugin();
    try {
        const api = new PDBeAPI('file://./test_data/api');
        const states: { [filename: string]: RawImageData } = {};
        const saveFunction = async (spec: ImageSpec) => { states[spec.filename] = await plugin.getImageRaw(); };
        const generator = new ImageGenerator(plugin, saveFunction, api, imageTypes, views);
        await generator.processAll(pdbId, `file://./test_data/structures/${pdbId}.${format}`, format, mode);
        return states;
    } finally {
        plugin.dispose();
    }
}

function getVisualNodes(state: PluginStateSnapshotManager.StateSnapshot) {
    const result = [];
    for (const entry of state.entries) {
        if (!entry.snapshot.data) continue;
        for (const transform of entry.snapshot.data.tree.transforms) {
            if (transform.transformer === 'ms-plugin.structure-representation-3d') {
                result.push(transform);
            }
        }
    }
    return result;
}


const ENTRY_OUTPUTS_1AD5 = [
    '1ad5_deposited_chain_front',
    '1ad5_deposited_chain_side',
    '1ad5_deposited_chain_top',
    '1ad5_deposited_chemically_distinct_molecules_front',
    '1ad5_deposited_chemically_distinct_molecules_side',
    '1ad5_deposited_chemically_distinct_molecules_top',
];
const ASSEMBLY_OUTPUTS_1AD5 = [
    '1ad5_assembly_1_chain_front',
    '1ad5_assembly_1_chain_side',
    '1ad5_assembly_1_chain_top',
    '1ad5_assembly_1_chemically_distinct_molecules_front',
    '1ad5_assembly_1_chemically_distinct_molecules_side',
    '1ad5_assembly_1_chemically_distinct_molecules_top',
    '1ad5_assembly_2_chain_front',
    '1ad5_assembly_2_chain_side',
    '1ad5_assembly_2_chain_top',
    '1ad5_assembly_2_chemically_distinct_molecules_front',
    '1ad5_assembly_2_chemically_distinct_molecules_side',
    '1ad5_assembly_2_chemically_distinct_molecules_top',
];
const ENTITY_OUTPUTS_1AD5 = [
    '1ad5_entity_1_front',
    '1ad5_entity_1_side',
    '1ad5_entity_1_top',
    '1ad5_entity_2_front',
    '1ad5_entity_2_side',
    '1ad5_entity_2_top',
    '1ad5_entity_3_front',
    '1ad5_entity_3_side',
    '1ad5_entity_3_top',
];
const DOMAIN_OUTPUTS_1AD5 = [
    '1ad5_1_A_CATH_1.10.510.10',
    '1ad5_1_A_CATH_2.30.30.40',
    '1ad5_1_A_CATH_3.30.200.20',
    '1ad5_1_A_CATH_3.30.505.10',
    '1ad5_1_A_Pfam_PF00017',
    '1ad5_1_A_Pfam_PF00018',
    '1ad5_1_A_Pfam_PF07714',
    '1ad5_1_A_SCOP_50045',
    '1ad5_1_A_SCOP_55551',
    '1ad5_1_A_SCOP_88854',
];
const LIGAND_OUTPUTS_1AD5 = [
    '1ad5_ligand_ANP',
    '1ad5_ligand_CA',
];
const MODRES_OUTPUTS_1AD5 = [
    '1ad5_modres_PTR_front',
    '1ad5_modres_PTR_side',
    '1ad5_modres_PTR_top',
];
const BFACTOR_OUTPUTS_1AD5 = [
    '1ad5_bfactor',
];
const VALIDATION_OUTPUTS_1AD5 = [
    '1ad5_validation_geometry_deposited',
];


describe('ImageGenerator creates correct states', () => {
    it('all states', async () => {
        const outputs = Object.keys(await generateStates('1ad5', ['all'], 'auto', 'bcif')).sort();
        expect(outputs).toEqual([
            ...ENTRY_OUTPUTS_1AD5,
            ...ASSEMBLY_OUTPUTS_1AD5,
            ...ENTITY_OUTPUTS_1AD5,
            ...DOMAIN_OUTPUTS_1AD5,
            ...LIGAND_OUTPUTS_1AD5,
            ...MODRES_OUTPUTS_1AD5,
            ...BFACTOR_OUTPUTS_1AD5,
            ...VALIDATION_OUTPUTS_1AD5,
        ].sort());
    }, TEST_TIMEOUT);

    it('selected states', async () => {
        let outputs: string[];
        outputs = Object.keys(await generateStates('1ad5', ['entry'], 'auto', 'bcif')).sort();
        expect(outputs).toEqual(ENTRY_OUTPUTS_1AD5);

        outputs = Object.keys(await generateStates('1ad5', ['assembly'], 'auto', 'bcif')).sort();
        expect(outputs).toEqual(ASSEMBLY_OUTPUTS_1AD5);

        outputs = Object.keys(await generateStates('1ad5', ['entity'], 'auto', 'bcif')).sort();
        expect(outputs).toEqual(ENTITY_OUTPUTS_1AD5);

        outputs = Object.keys(await generateStates('1ad5', ['domain'], 'auto', 'bcif')).sort();
        expect(outputs).toEqual(DOMAIN_OUTPUTS_1AD5);

        outputs = Object.keys(await generateStates('1ad5', ['ligand'], 'auto', 'bcif')).sort();
        expect(outputs).toEqual(LIGAND_OUTPUTS_1AD5);

        outputs = Object.keys(await generateStates('1ad5', ['modres'], 'auto', 'bcif')).sort();
        expect(outputs).toEqual(MODRES_OUTPUTS_1AD5);

        outputs = Object.keys(await generateStates('1ad5', ['bfactor'], 'auto', 'bcif')).sort();
        expect(outputs).toEqual(BFACTOR_OUTPUTS_1AD5);

        outputs = Object.keys(await generateStates('1ad5', ['validation'], 'auto', 'bcif')).sort();
        expect(outputs).toEqual(VALIDATION_OUTPUTS_1AD5);

        outputs = Object.keys(await generateStates('1ad5', ['assembly', 'domain', 'validation'], 'auto', 'bcif')).sort();
        expect(outputs).toEqual([...ASSEMBLY_OUTPUTS_1AD5, ...DOMAIN_OUTPUTS_1AD5, ...VALIDATION_OUTPUTS_1AD5].sort());
    }, TEST_TIMEOUT);

    it('all states, only front view', async () => {
        const expectedOutput = Array.from(new Set([
            ...ENTRY_OUTPUTS_1AD5,
            ...ASSEMBLY_OUTPUTS_1AD5,
            ...ENTITY_OUTPUTS_1AD5,
            ...DOMAIN_OUTPUTS_1AD5,
            ...LIGAND_OUTPUTS_1AD5,
            ...MODRES_OUTPUTS_1AD5,
            ...BFACTOR_OUTPUTS_1AD5,
            ...VALIDATION_OUTPUTS_1AD5,
        ].map(s => s.replace(/_front$/, '').replace(/_side$/, '').replace(/_top$/, '')))).sort();
        const outputs = Object.keys(await generateStates('1ad5', ['all'], 'front', 'bcif')).sort();
        expect(outputs).toEqual(expectedOutput);
    }, TEST_TIMEOUT);

    it('entry states, multi-model', async () => {
        const outputs = Object.keys(await generateStates('176d', ['entry'], 'front', 'bcif')).sort();
        expect(outputs).toEqual(['176d_deposited_chain', '176d_deposited_chemically_distinct_molecules']);
    }, TEST_TIMEOUT);

    it('all states for AlphaFold', async () => { // AlphaFold does not work with BCIF, not our fault
        const outputs = Object.keys(await generateStates('AF-Q8W3K0-F1-model_v4', ['all'], 'auto', 'cif', 'alphafold')).sort();
        expect(outputs).toEqual([
            'AF-Q8W3K0-F1-model_v4_plddt_front',
            'AF-Q8W3K0-F1-model_v4_plddt_side',
            'AF-Q8W3K0-F1-model_v4_plddt_top',
        ].sort());
    }, TEST_TIMEOUT);

    it('all states for AlphaFold, only front view', async () => { // AlphaFold does not work with BCIF, not our fault
        const outputs = Object.keys(await generateStates('AF-Q8W3K0-F1-model_v4', ['all'], 'front', 'cif', 'alphafold')).sort();
        expect(outputs).toEqual(['AF-Q8W3K0-F1-model_v4_plddt'].sort());
    }, TEST_TIMEOUT);
});


describe('ImageGenerator states contain some visuals', () => {
    it('all states', async () => {
        const outputs = await generateStates('1ad5', ['all'], 'auto', 'bcif');
        for (const filename of Object.keys(outputs).sort()) {
            const state = outputs[filename];
            expect(getVisualNodes(state)).not.toHaveLength(0);
        }
    }, TEST_TIMEOUT);

    it('all states for AlphaFold', async () => {
        const outputs = await generateStates('AF-Q8W3K0-F1-model_v4', ['all'], 'auto', 'cif', 'alphafold');
        for (const filename of Object.keys(outputs).sort()) {
            const state = outputs[filename];
            expect(getVisualNodes(state)).not.toHaveLength(0);
        }
    }, TEST_TIMEOUT);
});


describe('ImageGenerator images are not blank, but have blank border', () => {
    it('check isImageBlank works', async () => {
        expect(isImageBlank(await loadPngToRaw('./test_data/sample_images/white.png'))).toBeTruthy();
        expect(isImageBlank(await loadPngToRaw('./test_data/sample_images/axes_front.png'))).toBeFalsy();
        expect(isBorderBlank(await loadPngToRaw('./test_data/sample_images/white.png'))).toBeTruthy();
        expect(isBorderBlank(await loadPngToRaw('./test_data/sample_images/axes_front.png'))).toBeTruthy();
    }, TEST_TIMEOUT);

    it('entry images, all views', async () => {
        const images = await generateImages('1ad5', ['entry'], 'all', 'bcif');
        for (const filename of Object.keys(images).sort()) {
            expect(isImageBlank(images[filename])).toBeFalsy();
            expect(isBorderBlank(images[filename])).toBeTruthy();
        }
    }, TEST_TIMEOUT);

    it('assembly images', async () => {
        const images = await generateImages('1ad5', ['assembly'], 'front', 'bcif');
        for (const filename of Object.keys(images).sort()) {
            expect(isImageBlank(images[filename])).toBeFalsy();
            expect(isBorderBlank(images[filename])).toBeTruthy();
        }
    }, TEST_TIMEOUT);

    it('entity images', async () => {
        const images = await generateImages('1ad5', ['entity'], 'front', 'bcif');
        for (const filename of Object.keys(images).sort()) {
            expect(isImageBlank(images[filename])).toBeFalsy();
            expect(isBorderBlank(images[filename])).toBeTruthy();
        }
    }, TEST_TIMEOUT);

    it('domain images', async () => {
        const images = await generateImages('1ad5', ['domain'], 'front', 'bcif');
        for (const filename of Object.keys(images).sort()) {
            expect(isImageBlank(images[filename])).toBeFalsy();
            expect(isBorderBlank(images[filename])).toBeTruthy();
        }
    }, TEST_TIMEOUT);

    it('ligand images', async () => {
        const images = await generateImages('1ad5', ['ligand'], 'front', 'bcif');
        for (const filename of Object.keys(images).sort()) {
            expect(isImageBlank(images[filename])).toBeFalsy();
            expect(isBorderBlank(images[filename])).toBeTruthy();
        }
    }, TEST_TIMEOUT);

    it('modres images', async () => {
        const images = await generateImages('1ad5', ['modres'], 'front', 'bcif');
        for (const filename of Object.keys(images).sort()) {
            expect(isImageBlank(images[filename])).toBeFalsy();
            expect(isBorderBlank(images[filename])).toBeTruthy();
        }
    }, TEST_TIMEOUT);

    it('bfactor images', async () => {
        const images = await generateImages('1ad5', ['bfactor'], 'front', 'bcif');
        for (const filename of Object.keys(images).sort()) {
            expect(isImageBlank(images[filename])).toBeFalsy();
            expect(isBorderBlank(images[filename])).toBeTruthy();
        }
    }, TEST_TIMEOUT);

    it('validation images', async () => {
        const images = await generateImages('1ad5', ['validation'], 'front', 'bcif');
        for (const filename of Object.keys(images).sort()) {
            expect(isImageBlank(images[filename])).toBeFalsy();
            expect(isBorderBlank(images[filename])).toBeTruthy();
        }
    }, TEST_TIMEOUT);

    it('AlphaFold images', async () => {
        const images = await generateImages('AF-Q8W3K0-F1-model_v4', ['all'], 'front', 'cif', 'alphafold');
        for (const filename of Object.keys(images).sort()) {
            expect(isImageBlank(images[filename])).toBeFalsy();
            expect(isBorderBlank(images[filename])).toBeTruthy();
        }
    }, TEST_TIMEOUT);
});
