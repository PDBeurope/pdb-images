import { countDomains, selectBestChainForDomains, sortDomainsByChain, sortDomainsByEntity } from '../sifts';


const DOMAINS_1HDA: Parameters<typeof sortDomainsByEntity>[0] = {
    CATH: {
        '1.10.490.10': [
            { chunks: [{ CIFend: 141, CIFstart: 1, asymID: 'A', chain: 'A', entity_id: '1', segment: 1 }], family: '1.10.490.10', familyName: 'Globin-like', id: '1hdaA00', source: 'CATH' },
            { chunks: [{ CIFend: 145, CIFstart: 1, asymID: 'B', chain: 'B', entity_id: '2', segment: 1 }], family: '1.10.490.10', familyName: 'Globin-like', id: '1hdaB00', source: 'CATH' },
            { chunks: [{ CIFend: 141, CIFstart: 1, asymID: 'C', chain: 'C', entity_id: '1', segment: 1 }], family: '1.10.490.10', familyName: 'Globin-like', id: '1hdaC00', source: 'CATH' },
            { chunks: [{ CIFend: 145, CIFstart: 1, asymID: 'D', chain: 'D', entity_id: '2', segment: 1 }], family: '1.10.490.10', familyName: 'Globin-like', id: '1hdaD00', source: 'CATH' },
        ],
    },
    Pfam: {
        'PF00042': [
            { chunks: [{ CIFend: 136, CIFstart: 26, asymID: 'A', chain: 'A', entity_id: '1', segment: 1 }], family: 'PF00042', familyName: 'Globin', id: 'PF00042_1', source: 'Pfam' },
            { chunks: [{ CIFend: 140, CIFstart: 24, asymID: 'B', chain: 'B', entity_id: '2', segment: 1 }], family: 'PF00042', familyName: 'Globin', id: 'PF00042_2', source: 'Pfam' },
            { chunks: [{ CIFend: 136, CIFstart: 26, asymID: 'C', chain: 'C', entity_id: '1', segment: 1 }], family: 'PF00042', familyName: 'Globin', id: 'PF00042_3', source: 'Pfam' },
            { chunks: [{ CIFend: 140, CIFstart: 24, asymID: 'D', chain: 'D', entity_id: '2', segment: 1 }], family: 'PF00042', familyName: 'Globin', id: 'PF00042_4', source: 'Pfam' },
        ],
    },
    Rfam: {},
    SCOP: {
        '46463': [
            { chunks: [{ CIFend: 141, CIFstart: 1, asymID: 'A', chain: 'A', entity_id: '1', segment: 1 }], family: '46463', familyName: 'Globins', id: 'd1hdaa_', source: 'SCOP' },
            { chunks: [{ CIFend: 145, CIFstart: 1, asymID: 'B', chain: 'B', entity_id: '2', segment: 1 }], family: '46463', familyName: 'Globins', id: 'd1hdab_', source: 'SCOP' },
            { chunks: [{ CIFend: 141, CIFstart: 1, asymID: 'C', chain: 'C', entity_id: '1', segment: 1 }], family: '46463', familyName: 'Globins', id: 'd1hdac_', source: 'SCOP' },
            { chunks: [{ CIFend: 145, CIFstart: 1, asymID: 'D', chain: 'D', entity_id: '2', segment: 1 }], family: '46463', familyName: 'Globins', id: 'd1hdad_', source: 'SCOP' },
        ],
    },
};

const DOMAINS_BY_ENTITY_1HDA: ReturnType<typeof sortDomainsByEntity> = {
    CATH: {
        '1.10.490.10': {
            '1': [
                { chunks: [{ CIFend: 141, CIFstart: 1, asymID: 'A', chain: 'A', entity_id: '1', segment: 1 }], family: '1.10.490.10', familyName: 'Globin-like', id: '1hdaA00', source: 'CATH' },
                { chunks: [{ CIFend: 141, CIFstart: 1, asymID: 'C', chain: 'C', entity_id: '1', segment: 1 }], family: '1.10.490.10', familyName: 'Globin-like', id: '1hdaC00', source: 'CATH' },
            ],
            '2': [
                { chunks: [{ CIFend: 145, CIFstart: 1, asymID: 'B', chain: 'B', entity_id: '2', segment: 1 }], family: '1.10.490.10', familyName: 'Globin-like', id: '1hdaB00', source: 'CATH' },
                { chunks: [{ CIFend: 145, CIFstart: 1, asymID: 'D', chain: 'D', entity_id: '2', segment: 1 }], family: '1.10.490.10', familyName: 'Globin-like', id: '1hdaD00', source: 'CATH' },
            ],
        },
    },
    Pfam: {
        'PF00042': {
            '1': [
                { chunks: [{ CIFend: 136, CIFstart: 26, asymID: 'A', chain: 'A', entity_id: '1', segment: 1 }], family: 'PF00042', familyName: 'Globin', id: 'PF00042_1', source: 'Pfam' },
                { chunks: [{ CIFend: 136, CIFstart: 26, asymID: 'C', chain: 'C', entity_id: '1', segment: 1 }], family: 'PF00042', familyName: 'Globin', id: 'PF00042_3', source: 'Pfam' },
            ],
            '2': [
                { chunks: [{ CIFend: 140, CIFstart: 24, asymID: 'B', chain: 'B', entity_id: '2', segment: 1 }], family: 'PF00042', familyName: 'Globin', id: 'PF00042_2', source: 'Pfam' },
                { chunks: [{ CIFend: 140, CIFstart: 24, asymID: 'D', chain: 'D', entity_id: '2', segment: 1 }], family: 'PF00042', familyName: 'Globin', id: 'PF00042_4', source: 'Pfam' },
            ],
        },
    },
    SCOP: {
        '46463': {
            '1': [

                { chunks: [{ CIFend: 141, CIFstart: 1, asymID: 'A', chain: 'A', entity_id: '1', segment: 1 }], family: '46463', familyName: 'Globins', id: 'd1hdaa_', source: 'SCOP' },
                { chunks: [{ CIFend: 141, CIFstart: 1, asymID: 'C', chain: 'C', entity_id: '1', segment: 1 }], family: '46463', familyName: 'Globins', id: 'd1hdac_', source: 'SCOP' },
            ],
            '2': [
                { chunks: [{ CIFend: 145, CIFstart: 1, asymID: 'B', chain: 'B', entity_id: '2', segment: 1 }], family: '46463', familyName: 'Globins', id: 'd1hdab_', source: 'SCOP' },
                { chunks: [{ CIFend: 145, CIFstart: 1, asymID: 'D', chain: 'D', entity_id: '2', segment: 1 }], family: '46463', familyName: 'Globins', id: 'd1hdad_', source: 'SCOP' },
            ],
        },
    },
};


describe('sifts', () => {
    it('sortDomainsByEntity', async () => {
        expect(sortDomainsByEntity(DOMAINS_1HDA)).toEqual(DOMAINS_BY_ENTITY_1HDA);
    });


    it('selectBestChainForDomains', async () => {
        expect(selectBestChainForDomains(DOMAINS_BY_ENTITY_1HDA)).toEqual({
            CATH: {
                '1.10.490.10': {
                    '1': [{ chunks: [{ CIFend: 141, CIFstart: 1, asymID: 'A', chain: 'A', entity_id: '1', segment: 1 }], family: '1.10.490.10', familyName: 'Globin-like', id: '1hdaA00', source: 'CATH' }],
                    '2': [{ chunks: [{ CIFend: 145, CIFstart: 1, asymID: 'B', chain: 'B', entity_id: '2', segment: 1 }], family: '1.10.490.10', familyName: 'Globin-like', id: '1hdaB00', source: 'CATH' }],
                },
            },
            Pfam: {
                'PF00042': {
                    '1': [{ chunks: [{ CIFend: 136, CIFstart: 26, asymID: 'A', chain: 'A', entity_id: '1', segment: 1 }], family: 'PF00042', familyName: 'Globin', id: 'PF00042_1', source: 'Pfam' }],
                    '2': [{ chunks: [{ CIFend: 140, CIFstart: 24, asymID: 'B', chain: 'B', entity_id: '2', segment: 1 }], family: 'PF00042', familyName: 'Globin', id: 'PF00042_2', source: 'Pfam' }],
                },
            },
            SCOP: {
                '46463': {
                    '1': [{ chunks: [{ CIFend: 141, CIFstart: 1, asymID: 'A', chain: 'A', entity_id: '1', segment: 1 }], family: '46463', familyName: 'Globins', id: 'd1hdaa_', source: 'SCOP' }],
                    '2': [{ chunks: [{ CIFend: 145, CIFstart: 1, asymID: 'B', chain: 'B', entity_id: '2', segment: 1 }], family: '46463', familyName: 'Globins', id: 'd1hdab_', source: 'SCOP' }],
                },
            },
        } as ReturnType<typeof selectBestChainForDomains>);

        expect(selectBestChainForDomains(DOMAINS_BY_ENTITY_1HDA, { 'A': 100, 'B': 200, 'C': 95, 'D': 202 })).toEqual({
            CATH: {
                '1.10.490.10': {
                    '1': [{ chunks: [{ CIFend: 141, CIFstart: 1, asymID: 'A', chain: 'A', entity_id: '1', segment: 1 }], family: '1.10.490.10', familyName: 'Globin-like', id: '1hdaA00', source: 'CATH' }],
                    '2': [{ chunks: [{ CIFend: 145, CIFstart: 1, asymID: 'D', chain: 'D', entity_id: '2', segment: 1 }], family: '1.10.490.10', familyName: 'Globin-like', id: '1hdaD00', source: 'CATH' }],
                },
            },
            Pfam: {
                'PF00042': {
                    '1': [{ chunks: [{ CIFend: 136, CIFstart: 26, asymID: 'A', chain: 'A', entity_id: '1', segment: 1 }], family: 'PF00042', familyName: 'Globin', id: 'PF00042_1', source: 'Pfam' }],
                    '2': [{ chunks: [{ CIFend: 140, CIFstart: 24, asymID: 'D', chain: 'D', entity_id: '2', segment: 1 }], family: 'PF00042', familyName: 'Globin', id: 'PF00042_4', source: 'Pfam' }],
                },
            },
            SCOP: {
                '46463': {
                    '1': [{ chunks: [{ CIFend: 141, CIFstart: 1, asymID: 'A', chain: 'A', entity_id: '1', segment: 1 }], family: '46463', familyName: 'Globins', id: 'd1hdaa_', source: 'SCOP' }],
                    '2': [{ chunks: [{ CIFend: 145, CIFstart: 1, asymID: 'D', chain: 'D', entity_id: '2', segment: 1 }], family: '46463', familyName: 'Globins', id: 'd1hdad_', source: 'SCOP' }],
                },
            },
        } as ReturnType<typeof selectBestChainForDomains>);

    });


    it('sortDomainsByChain', async () => {
        expect(sortDomainsByChain(DOMAINS_BY_ENTITY_1HDA)).toEqual({
            'A': {
                CATH: {
                    '1.10.490.10': [
                        { chunks: [{ CIFend: 141, CIFstart: 1, asymID: 'A', chain: 'A', entity_id: '1', segment: 1 }], family: '1.10.490.10', familyName: 'Globin-like', id: '1hdaA00', source: 'CATH' },
                    ],
                },
                Pfam: {
                    'PF00042': [
                        { chunks: [{ CIFend: 136, CIFstart: 26, asymID: 'A', chain: 'A', entity_id: '1', segment: 1 }], family: 'PF00042', familyName: 'Globin', id: 'PF00042_1', source: 'Pfam' },
                    ],
                },
                SCOP: {
                    '46463': [
                        { chunks: [{ CIFend: 141, CIFstart: 1, asymID: 'A', chain: 'A', entity_id: '1', segment: 1 }], family: '46463', familyName: 'Globins', id: 'd1hdaa_', source: 'SCOP' },
                    ],
                },
            },
            'B': {
                CATH: {
                    '1.10.490.10': [
                        { chunks: [{ CIFend: 145, CIFstart: 1, asymID: 'B', chain: 'B', entity_id: '2', segment: 1 }], family: '1.10.490.10', familyName: 'Globin-like', id: '1hdaB00', source: 'CATH' },
                    ],
                },
                Pfam: {
                    'PF00042': [
                        { chunks: [{ CIFend: 140, CIFstart: 24, asymID: 'B', chain: 'B', entity_id: '2', segment: 1 }], family: 'PF00042', familyName: 'Globin', id: 'PF00042_2', source: 'Pfam' },
                    ],
                },
                SCOP: {
                    '46463': [
                        { chunks: [{ CIFend: 145, CIFstart: 1, asymID: 'B', chain: 'B', entity_id: '2', segment: 1 }], family: '46463', familyName: 'Globins', id: 'd1hdab_', source: 'SCOP' },
                    ],
                },
            },
            'C': {
                CATH: {
                    '1.10.490.10': [
                        { chunks: [{ CIFend: 141, CIFstart: 1, asymID: 'C', chain: 'C', entity_id: '1', segment: 1 }], family: '1.10.490.10', familyName: 'Globin-like', id: '1hdaC00', source: 'CATH' },
                    ],
                },
                Pfam: {
                    'PF00042': [
                        { chunks: [{ CIFend: 136, CIFstart: 26, asymID: 'C', chain: 'C', entity_id: '1', segment: 1 }], family: 'PF00042', familyName: 'Globin', id: 'PF00042_3', source: 'Pfam' },
                    ],
                },
                SCOP: {
                    '46463': [
                        { chunks: [{ CIFend: 141, CIFstart: 1, asymID: 'C', chain: 'C', entity_id: '1', segment: 1 }], family: '46463', familyName: 'Globins', id: 'd1hdac_', source: 'SCOP' },
                    ],
                },
            },
            'D': {
                CATH: {
                    '1.10.490.10': [
                        { chunks: [{ CIFend: 145, CIFstart: 1, asymID: 'D', chain: 'D', entity_id: '2', segment: 1 }], family: '1.10.490.10', familyName: 'Globin-like', id: '1hdaD00', source: 'CATH' },
                    ],
                },
                Pfam: {
                    'PF00042': [
                        { chunks: [{ CIFend: 140, CIFstart: 24, asymID: 'D', chain: 'D', entity_id: '2', segment: 1 }], family: 'PF00042', familyName: 'Globin', id: 'PF00042_4', source: 'Pfam' },
                    ],
                },
                SCOP: {
                    '46463': [
                        { chunks: [{ CIFend: 145, CIFstart: 1, asymID: 'D', chain: 'D', entity_id: '2', segment: 1 }], family: '46463', familyName: 'Globins', id: 'd1hdad_', source: 'SCOP' },
                    ],
                },
            },
        } as ReturnType<typeof sortDomainsByChain>);
    });

    it('countDomains', async () => {
        expect(countDomains(DOMAINS_BY_ENTITY_1HDA)).toEqual({
            CATH: { '1.10.490.10': { '1': 2, '2': 2 } },
            Pfam: { 'PF00042': { '1': 2, '2': 2 } },
            SCOP: { '46463': { '1': 2, '2': 2 } },
        } as ReturnType<typeof countDomains>);
    });

});
