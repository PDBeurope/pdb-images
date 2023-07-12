/**
 * Copyright (c) 2023 EMBL - European Bioinformatics Institute, licensed under Apache 2.0, see LICENSE file for more info.
 *
 * @author Adam Midlik <midlik@gmail.com>
 */

import { PDBeAPI, PDBeAPIReturn } from '../api';


const API = new PDBeAPI('file://./test_data/api');
const NO_API = new PDBeAPI('', true);


describe('api', () => {
    it('noApi', async () => {
        expect(NO_API.pdbeStructureQualityReportPrefix()).toBeUndefined();
        expect(await NO_API.getEntityNames('1hda')).toEqual({} as PDBeAPIReturn<'getEntityNames'>);
        expect(await NO_API.getAssemblies('1hda')).toEqual([] as PDBeAPIReturn<'getAssemblies'>);
        expect(await NO_API.getPreferredAssemblyId('1hda'))
            .toEqual(undefined as PDBeAPIReturn<'getPreferredAssemblyId'>);
        expect(await NO_API.getModifiedResidue('1hda')).toEqual([] as PDBeAPIReturn<'getModifiedResidue'>);
        expect(await NO_API.getSiftsMappings('1hda'))
            .toEqual({ CATH: {}, Pfam: {}, Rfam: {}, SCOP: {} } as PDBeAPIReturn<'getSiftsMappings'>);
    });

    it('pdbeStructureQualityReportPrefix', async () => {
        expect(API.pdbeStructureQualityReportPrefix())
            .toEqual('file://./test_data/api/validation/residuewise_outlier_summary/entry/');
    });

    it('getEntityNames', async () => {
        expect(await API.getEntityNames('1hda')).toEqual({
            '1': ['Hemoglobin subunit alpha'],
            '2': ['Hemoglobin subunit beta'],
            '3': ['PROTOPORPHYRIN IX CONTAINING FE'],
            '4': ['water'],
        } as PDBeAPIReturn<'getEntityNames'>);
    });

    it('getAssemblies', async () => {
        expect(await API.getAssemblies('1hda')).toEqual([
            { assemblyId: '1', form: 'hetero', name: 'tetramer', preferred: true },
        ] as PDBeAPIReturn<'getAssemblies'>);
        expect(await API.getAssemblies('1tqn')).toEqual([
            { assemblyId: '1', form: 'homo', name: 'monomer', preferred: false },
            { assemblyId: '2', form: 'homo', name: 'tetramer', preferred: true },
        ] as PDBeAPIReturn<'getAssemblies'>);
    });

    it('getPreferredAssemblyId', async () => {
        expect(await API.getPreferredAssemblyId('1hda')).toEqual('1' as PDBeAPIReturn<'getPreferredAssemblyId'>);
        expect(await API.getPreferredAssemblyId('1tqn')).toEqual('2' as PDBeAPIReturn<'getPreferredAssemblyId'>);
    });

    it('getModifiedResidue', async () => {
        expect(await API.getModifiedResidue('1hda')).toEqual([] as PDBeAPIReturn<'getModifiedResidue'>);
        expect(await API.getModifiedResidue('1gkt')).toEqual([
            { authChainId: 'A', compoundId: 'SUI', compoundName: '(3-AMINO-2,5-DIOXO-1-PYRROLIDINYL)ACETIC ACID', entityId: 1, labelChainId: 'A', residueNumber: 54 }
        ] as PDBeAPIReturn<'getModifiedResidue'>);
        expect(await API.getModifiedResidue('1l7c')).toEqual([
            { authChainId: 'A', compoundId: 'MSE', compoundName: 'SELENOMETHIONINE', entityId: 1, labelChainId: 'A', residueNumber: 70 },
            { authChainId: 'A', compoundId: 'MSE', compoundName: 'SELENOMETHIONINE', entityId: 1, labelChainId: 'A', residueNumber: 102 },
            { authChainId: 'A', compoundId: 'MSE', compoundName: 'SELENOMETHIONINE', entityId: 1, labelChainId: 'A', residueNumber: 178 },
            { authChainId: 'A', compoundId: 'MSE', compoundName: 'SELENOMETHIONINE', entityId: 1, labelChainId: 'A', residueNumber: 202 },
            { authChainId: 'A', compoundId: 'MSE', compoundName: 'SELENOMETHIONINE', entityId: 1, labelChainId: 'A', residueNumber: 224 },
            { authChainId: 'A', compoundId: 'MSE', compoundName: 'SELENOMETHIONINE', entityId: 1, labelChainId: 'A', residueNumber: 249 },
            { authChainId: 'B', compoundId: 'MSE', compoundName: 'SELENOMETHIONINE', entityId: 1, labelChainId: 'B', residueNumber: 70 },
            { authChainId: 'B', compoundId: 'MSE', compoundName: 'SELENOMETHIONINE', entityId: 1, labelChainId: 'B', residueNumber: 102 },
            { authChainId: 'B', compoundId: 'MSE', compoundName: 'SELENOMETHIONINE', entityId: 1, labelChainId: 'B', residueNumber: 178 },
            { authChainId: 'B', compoundId: 'MSE', compoundName: 'SELENOMETHIONINE', entityId: 1, labelChainId: 'B', residueNumber: 202 },
            { authChainId: 'B', compoundId: 'MSE', compoundName: 'SELENOMETHIONINE', entityId: 1, labelChainId: 'B', residueNumber: 224 },
            { authChainId: 'B', compoundId: 'MSE', compoundName: 'SELENOMETHIONINE', entityId: 1, labelChainId: 'B', residueNumber: 249 },
            { authChainId: 'C', compoundId: 'MSE', compoundName: 'SELENOMETHIONINE', entityId: 1, labelChainId: 'C', residueNumber: 70 },
            { authChainId: 'C', compoundId: 'MSE', compoundName: 'SELENOMETHIONINE', entityId: 1, labelChainId: 'C', residueNumber: 102 },
            { authChainId: 'C', compoundId: 'MSE', compoundName: 'SELENOMETHIONINE', entityId: 1, labelChainId: 'C', residueNumber: 178 },
            { authChainId: 'C', compoundId: 'MSE', compoundName: 'SELENOMETHIONINE', entityId: 1, labelChainId: 'C', residueNumber: 202 },
            { authChainId: 'C', compoundId: 'MSE', compoundName: 'SELENOMETHIONINE', entityId: 1, labelChainId: 'C', residueNumber: 224 },
            { authChainId: 'C', compoundId: 'MSE', compoundName: 'SELENOMETHIONINE', entityId: 1, labelChainId: 'C', residueNumber: 249 },
        ] as PDBeAPIReturn<'getModifiedResidue'>);
        expect(await API.getModifiedResidue('1hcj')).toEqual([
            { authChainId: 'A', compoundId: 'GYS', compoundName: '[(4Z)-2-(1-AMINO-2-HYDROXYETHYL)-4-(4-HYDROXYBENZYLIDENE)-5-OXO-4,5-DIHYDRO-1H-IMIDAZOL-1-YL]ACETIC ACID', entityId: 1, labelChainId: 'A', residueNumber: 65 },
            { authChainId: 'A', compoundId: 'ABA', compoundName: 'ALPHA-AMINOBUTYRIC ACID', entityId: 1, labelChainId: 'A', residueNumber: 220 },
            { authChainId: 'B', compoundId: 'GYS', compoundName: '[(4Z)-2-(1-AMINO-2-HYDROXYETHYL)-4-(4-HYDROXYBENZYLIDENE)-5-OXO-4,5-DIHYDRO-1H-IMIDAZOL-1-YL]ACETIC ACID', entityId: 1, labelChainId: 'B', residueNumber: 65 },
            { authChainId: 'B', compoundId: 'ABA', compoundName: 'ALPHA-AMINOBUTYRIC ACID', entityId: 1, labelChainId: 'B', residueNumber: 220 },
            { authChainId: 'C', compoundId: 'GYS', compoundName: '[(4Z)-2-(1-AMINO-2-HYDROXYETHYL)-4-(4-HYDROXYBENZYLIDENE)-5-OXO-4,5-DIHYDRO-1H-IMIDAZOL-1-YL]ACETIC ACID', entityId: 1, labelChainId: 'C', residueNumber: 65 },
            { authChainId: 'C', compoundId: 'ABA', compoundName: 'ALPHA-AMINOBUTYRIC ACID', entityId: 1, labelChainId: 'C', residueNumber: 220 },
            { authChainId: 'D', compoundId: 'GYS', compoundName: '[(4Z)-2-(1-AMINO-2-HYDROXYETHYL)-4-(4-HYDROXYBENZYLIDENE)-5-OXO-4,5-DIHYDRO-1H-IMIDAZOL-1-YL]ACETIC ACID', entityId: 1, labelChainId: 'D', residueNumber: 65 },
            { authChainId: 'D', compoundId: 'ABA', compoundName: 'ALPHA-AMINOBUTYRIC ACID', entityId: 1, labelChainId: 'D', residueNumber: 220 },
        ] as PDBeAPIReturn<'getModifiedResidue'>);
    });

    it('getSiftsMappings protein', async () => {
        expect(await API.getSiftsMappings('1hda')).toEqual({
            CATH: {
                '1.10.490.10': [
                    { chunks: [{ endResidue: 141, startResidue: 1, chainId: 'A', authChainId: 'A', entityId: '1', segment: 1 }], family: '1.10.490.10', familyName: 'Globin-like', id: '1hdaA00', source: 'CATH' },
                    { chunks: [{ endResidue: 145, startResidue: 1, chainId: 'B', authChainId: 'B', entityId: '2', segment: 1 }], family: '1.10.490.10', familyName: 'Globin-like', id: '1hdaB00', source: 'CATH' },
                    { chunks: [{ endResidue: 141, startResidue: 1, chainId: 'C', authChainId: 'C', entityId: '1', segment: 1 }], family: '1.10.490.10', familyName: 'Globin-like', id: '1hdaC00', source: 'CATH' },
                    { chunks: [{ endResidue: 145, startResidue: 1, chainId: 'D', authChainId: 'D', entityId: '2', segment: 1 }], family: '1.10.490.10', familyName: 'Globin-like', id: '1hdaD00', source: 'CATH' },
                ],
            },
            Pfam: {
                'PF00042': [
                    { chunks: [{ endResidue: 136, startResidue: 26, chainId: 'A', authChainId: 'A', entityId: '1', segment: 1 }], family: 'PF00042', familyName: 'Globin', id: 'PF00042_1', source: 'Pfam' },
                    { chunks: [{ endResidue: 140, startResidue: 24, chainId: 'B', authChainId: 'B', entityId: '2', segment: 1 }], family: 'PF00042', familyName: 'Globin', id: 'PF00042_2', source: 'Pfam' },
                    { chunks: [{ endResidue: 136, startResidue: 26, chainId: 'C', authChainId: 'C', entityId: '1', segment: 1 }], family: 'PF00042', familyName: 'Globin', id: 'PF00042_3', source: 'Pfam' },
                    { chunks: [{ endResidue: 140, startResidue: 24, chainId: 'D', authChainId: 'D', entityId: '2', segment: 1 }], family: 'PF00042', familyName: 'Globin', id: 'PF00042_4', source: 'Pfam' },
                ],
            },
            Rfam: {},
            SCOP: {
                '46463': [
                    { chunks: [{ endResidue: 141, startResidue: 1, chainId: 'A', authChainId: 'A', entityId: '1', segment: 1 }], family: '46463', familyName: 'Globins', id: 'd1hdaa_', source: 'SCOP' },
                    { chunks: [{ endResidue: 145, startResidue: 1, chainId: 'B', authChainId: 'B', entityId: '2', segment: 1 }], family: '46463', familyName: 'Globins', id: 'd1hdab_', source: 'SCOP' },
                    { chunks: [{ endResidue: 141, startResidue: 1, chainId: 'C', authChainId: 'C', entityId: '1', segment: 1 }], family: '46463', familyName: 'Globins', id: 'd1hdac_', source: 'SCOP' },
                    { chunks: [{ endResidue: 145, startResidue: 1, chainId: 'D', authChainId: 'D', entityId: '2', segment: 1 }], family: '46463', familyName: 'Globins', id: 'd1hdad_', source: 'SCOP' },
                ],
            },
        } as PDBeAPIReturn<'getSiftsMappings'>);
    });

    it('getSiftsMappings protein multisegment', async () => {
        expect(await API.getSiftsMappings('1n26')).toEqual({
            CATH: {
                '2.60.40.10': [
                    { chunks: [{ authChainId: 'A', chainId: 'A', endResidue: 9, entityId: '1', segment: 1, startResidue: 2 }, { authChainId: 'A', chainId: 'A', endResidue: 192, entityId: '1', segment: 2, startResidue: 94 }], family: '2.60.40.10', familyName: 'Immunoglobulin-like', id: '1n26A01', source: 'CATH' },
                    { chunks: [{ authChainId: 'A', chainId: 'A', endResidue: 91, entityId: '1', segment: 1, startResidue: 14 }], family: '2.60.40.10', familyName: 'Immunoglobulin-like', id: '1n26A02', source: 'CATH' },
                    { chunks: [{ authChainId: 'A', chainId: 'A', endResidue: 299, entityId: '1', segment: 1, startResidue: 196 }], family: '2.60.40.10', familyName: 'Immunoglobulin-like', id: '1n26A03', source: 'CATH' }],
            },
            Pfam: {
                'PF00047': [
                    { chunks: [{ authChainId: 'A', chainId: 'A', endResidue: 82, entityId: '1', segment: 1, startResidue: 11 }], family: 'PF00047', familyName: 'Immunoglobulin domain', id: 'PF00047_1', source: 'Pfam' }],
                'PF09240': [
                    { chunks: [{ authChainId: 'A', chainId: 'A', endResidue: 194, entityId: '1', segment: 1, startResidue: 99 }], family: 'PF09240', familyName: 'Interleukin-6 receptor alpha chain, binding', id: 'PF09240_1', source: 'Pfam' }],
            },
            Rfam: {},
            SCOP: {
                '49159': [
                    { chunks: [{ authChainId: 'A', chainId: 'A', endResidue: 93, entityId: '1', segment: 1, startResidue: 1 }], family: '49159', familyName: 'I set domains', id: 'd1n26a1', source: 'SCOP' }],
                '49266': [
                    { chunks: [{ authChainId: 'A', chainId: 'A', endResidue: 195, entityId: '1', segment: 1, startResidue: 94 }], family: '49266', familyName: 'Fibronectin type III', id: 'd1n26a2', source: 'SCOP' },
                    { chunks: [{ authChainId: 'A', chainId: 'A', endResidue: 299, entityId: '1', segment: 1, startResidue: 196 }], family: '49266', familyName: 'Fibronectin type III', id: 'd1n26a3', source: 'SCOP' }],
            },
        } as PDBeAPIReturn<'getSiftsMappings'>);
    });

    it('getSiftsMappings nucleic', async () => {
        expect(await API.getSiftsMappings('2gcv')).toEqual({
            CATH: {},
            Pfam: {},
            Rfam: {
                'RF00234': [
                    { chunks: [{ endResidue: 125, startResidue: 1, chainId: 'B', authChainId: 'B', entityId: '2', segment: 1 }], family: 'RF00234', familyName: 'glmS glucosamine-6-phosphate activated ribozyme', id: 'RF00234_1', source: 'Rfam' },
                ],
            },
            SCOP: {}
        } as PDBeAPIReturn<'getSiftsMappings'>);
    });
});
