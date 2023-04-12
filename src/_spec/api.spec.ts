import { PDBeAPI } from '../api';


function getTestingApi() {
    return new PDBeAPI('file://./test_data/api');
}
function getTestingNoApi() {
    return new PDBeAPI('', true);
}

type MethodName = 'pdbeStructureQualityReportPrefix' | 'getEntityNames' | 'getAssemblies' | 'getPreferredAssembly' | 'getModifiedResidue' | 'getSiftsMappings'
type MethodReturn<key extends MethodName> = Awaited<ReturnType<InstanceType<typeof PDBeAPI>[key]>>

describe('api', () => {
    it('noApi', async () => {
        const api = getTestingNoApi();
        expect(api.pdbeStructureQualityReportPrefix()).toBeUndefined();
        expect(await api.getEntityNames('1hda')).toEqual({} as MethodReturn<'getEntityNames'>);
        expect(await api.getAssemblies('1hda')).toEqual([] as MethodReturn<'getAssemblies'>);
        expect(await api.getPreferredAssembly('1hda'))
            .toEqual({ assemblyId: '1', form: '?', preferred: true, name: '?' } as MethodReturn<'getPreferredAssembly'>);
        expect(await api.getModifiedResidue('1hda')).toEqual([] as MethodReturn<'getModifiedResidue'>);
        expect(await api.getSiftsMappings('1hda'))
            .toEqual({ CATH: {}, Pfam: {}, Rfam: {}, SCOP: {} } as MethodReturn<'getSiftsMappings'>);
    });

    it('pdbeStructureQualityReportPrefix', async () => {
        const api = getTestingApi();
        expect(api.pdbeStructureQualityReportPrefix())
            .toEqual('file://./test_data/api/validation/residuewise_outlier_summary/entry/');
    });

    it('getEntityNames', async () => {
        const api = getTestingApi();
        expect(await api.getEntityNames('1hda')).toEqual({
            '1': ['Hemoglobin subunit alpha'],
            '2': ['Hemoglobin subunit beta'],
            '3': ['PROTOPORPHYRIN IX CONTAINING FE'],
            '4': ['water'],
        } as MethodReturn<'getEntityNames'>);
    });

    it('getAssemblies', async () => {
        const api = getTestingApi();
        expect(await api.getAssemblies('1hda')).toEqual([
            { assemblyId: '1', form: 'hetero', name: 'tetramer', preferred: true },
        ] as MethodReturn<'getAssemblies'>);
        expect(await api.getAssemblies('1tqn')).toEqual([
            { assemblyId: '1', form: 'homo', name: 'monomer', preferred: false },
            { assemblyId: '2', form: 'homo', name: 'tetramer', preferred: true },
        ] as MethodReturn<'getAssemblies'>);
    });
    // TODO The API must be broken!!!
    // Preferred assembly for 1tqn shouldn't be tetramer!!!
    // Report and possibly fix sample testing data!

    it('getPreferredAssembly', async () => {
        const api = getTestingApi();
        expect(await api.getPreferredAssembly('1hda')).toEqual({
            assemblyId: '1', form: 'hetero', name: 'tetramer', preferred: true
        } as MethodReturn<'getPreferredAssembly'>);
        expect(await api.getPreferredAssembly('1tqn')).toEqual({
            assemblyId: '2', form: 'homo', name: 'tetramer', preferred: true
        } as MethodReturn<'getPreferredAssembly'>);
    });

    it('getModifiedResidue', async () => {
        const api = getTestingApi();
        expect(await api.getModifiedResidue('1hda')).toEqual([] as MethodReturn<'getModifiedResidue'>);
        expect(await api.getModifiedResidue('1gkt')).toEqual([
            { authChainId: 'A', compoundId: 'SUI', compoundName: '(3-AMINO-2,5-DIOXO-1-PYRROLIDINYL)ACETIC ACID', entityId: 1, labelChainId: 'A', residueNumber: 54 }
        ] as MethodReturn<'getModifiedResidue'>);
        expect(await api.getModifiedResidue('1l7c')).toEqual([
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
        ] as MethodReturn<'getModifiedResidue'>);
        expect(await api.getModifiedResidue('1hcj')).toEqual([
            { authChainId: 'A', compoundId: 'GYS', compoundName: '[(4Z)-2-(1-AMINO-2-HYDROXYETHYL)-4-(4-HYDROXYBENZYLIDENE)-5-OXO-4,5-DIHYDRO-1H-IMIDAZOL-1-YL]ACETIC ACID', entityId: 1, labelChainId: 'A', residueNumber: 65 },
            { authChainId: 'A', compoundId: 'ABA', compoundName: 'ALPHA-AMINOBUTYRIC ACID', entityId: 1, labelChainId: 'A', residueNumber: 220 },
            { authChainId: 'B', compoundId: 'GYS', compoundName: '[(4Z)-2-(1-AMINO-2-HYDROXYETHYL)-4-(4-HYDROXYBENZYLIDENE)-5-OXO-4,5-DIHYDRO-1H-IMIDAZOL-1-YL]ACETIC ACID', entityId: 1, labelChainId: 'B', residueNumber: 65 },
            { authChainId: 'B', compoundId: 'ABA', compoundName: 'ALPHA-AMINOBUTYRIC ACID', entityId: 1, labelChainId: 'B', residueNumber: 220 },
            { authChainId: 'C', compoundId: 'GYS', compoundName: '[(4Z)-2-(1-AMINO-2-HYDROXYETHYL)-4-(4-HYDROXYBENZYLIDENE)-5-OXO-4,5-DIHYDRO-1H-IMIDAZOL-1-YL]ACETIC ACID', entityId: 1, labelChainId: 'C', residueNumber: 65 },
            { authChainId: 'C', compoundId: 'ABA', compoundName: 'ALPHA-AMINOBUTYRIC ACID', entityId: 1, labelChainId: 'C', residueNumber: 220 },
            { authChainId: 'D', compoundId: 'GYS', compoundName: '[(4Z)-2-(1-AMINO-2-HYDROXYETHYL)-4-(4-HYDROXYBENZYLIDENE)-5-OXO-4,5-DIHYDRO-1H-IMIDAZOL-1-YL]ACETIC ACID', entityId: 1, labelChainId: 'D', residueNumber: 65 },
            { authChainId: 'D', compoundId: 'ABA', compoundName: 'ALPHA-AMINOBUTYRIC ACID', entityId: 1, labelChainId: 'D', residueNumber: 220 },
        ] as MethodReturn<'getModifiedResidue'>);
    });

    it('getSiftsMappings protein', async () => {
        const api = getTestingApi();
        expect(await api.getSiftsMappings('1hda')).toEqual({
            CATH: {
                '1.10.490.10': [
                    { chunks: [{ endResidue: 141, startResidue: 1, chainId: 'A', authChainId: 'A', entityId: '1', segment: 1 }], family: '1.10.490.10', familyName: 'Globin-like', id: '1hdaA00', source: 'CATH', },
                    { chunks: [{ endResidue: 145, startResidue: 1, chainId: 'B', authChainId: 'B', entityId: '2', segment: 1 }], family: '1.10.490.10', familyName: 'Globin-like', id: '1hdaB00', source: 'CATH', },
                    { chunks: [{ endResidue: 141, startResidue: 1, chainId: 'C', authChainId: 'C', entityId: '1', segment: 1 }], family: '1.10.490.10', familyName: 'Globin-like', id: '1hdaC00', source: 'CATH', },
                    { chunks: [{ endResidue: 145, startResidue: 1, chainId: 'D', authChainId: 'D', entityId: '2', segment: 1 }], family: '1.10.490.10', familyName: 'Globin-like', id: '1hdaD00', source: 'CATH', },
                ],
            },
            Pfam: {
                'PF00042': [
                    { chunks: [{ endResidue: 136, startResidue: 26, chainId: 'A', authChainId: 'A', entityId: '1', segment: 1 }], family: 'PF00042', familyName: 'Globin', id: 'PF00042_1', source: 'Pfam', },
                    { chunks: [{ endResidue: 140, startResidue: 24, chainId: 'B', authChainId: 'B', entityId: '2', segment: 1 }], family: 'PF00042', familyName: 'Globin', id: 'PF00042_2', source: 'Pfam', },
                    { chunks: [{ endResidue: 136, startResidue: 26, chainId: 'C', authChainId: 'C', entityId: '1', segment: 1 }], family: 'PF00042', familyName: 'Globin', id: 'PF00042_3', source: 'Pfam', },
                    { chunks: [{ endResidue: 140, startResidue: 24, chainId: 'D', authChainId: 'D', entityId: '2', segment: 1 }], family: 'PF00042', familyName: 'Globin', id: 'PF00042_4', source: 'Pfam', },
                ],
            },
            Rfam: {},
            SCOP: {
                '46463': [
                    { chunks: [{ endResidue: 141, startResidue: 1, chainId: 'A', authChainId: 'A', entityId: '1', segment: 1 }], family: '46463', familyName: 'Globins', id: 'd1hdaa_', source: 'SCOP', },
                    { chunks: [{ endResidue: 145, startResidue: 1, chainId: 'B', authChainId: 'B', entityId: '2', segment: 1 }], family: '46463', familyName: 'Globins', id: 'd1hdab_', source: 'SCOP', },
                    { chunks: [{ endResidue: 141, startResidue: 1, chainId: 'C', authChainId: 'C', entityId: '1', segment: 1 }], family: '46463', familyName: 'Globins', id: 'd1hdac_', source: 'SCOP', },
                    { chunks: [{ endResidue: 145, startResidue: 1, chainId: 'D', authChainId: 'D', entityId: '2', segment: 1 }], family: '46463', familyName: 'Globins', id: 'd1hdad_', source: 'SCOP', },
                ],
            },
        } as MethodReturn<'getSiftsMappings'>);
    });

    test.todo('getSiftsMappings protein multisegment');
    // it('getSiftsMappings protein multisegment', async () => {
    //     const api = getTestingApi();
    //     expect(await api.getSiftsMappings('1n26')).toEqual({ CATH: {}, Pfam: {}, Rfam: {}, SCOP: {} });
    //     // TODO get data
    // });

    it('getSiftsMappings nucleic', async () => {
        const api = getTestingApi();
        expect(await api.getSiftsMappings('2gcv')).toEqual({
            CATH: {},
            Pfam: {},
            Rfam: {
                'RF00234': [
                    { chunks: [{ endResidue: 125, startResidue: 1, chainId: 'B', authChainId: 'B', entityId: '2', segment: 1 }], family: 'RF00234', familyName: 'glmS glucosamine-6-phosphate activated ribozyme', id: 'RF00234_1', source: 'Rfam' },
                ],
            },
            SCOP: {}
        } as MethodReturn<'getSiftsMappings'>);
    });
});


// TODO add check for label_asym_id vs auth_asym_id
