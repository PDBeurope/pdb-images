/**
 * Copyright (c) 2023 EMBL - European Bioinformatics Institute, licensed under Apache 2.0, see LICENSE file for more info.
 *
 * @author Adam Midlik <midlik@gmail.com>
 */

import { countDomains, selectBestChainForDomains, sortDomainsByChain, sortDomainsByEntity } from '../sifts';


const DOMAINS_1HDA: Parameters<typeof sortDomainsByEntity>[0] = {
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
};

const DOMAINS_BY_ENTITY_1HDA: ReturnType<typeof sortDomainsByEntity> = {
    CATH: {
        '1.10.490.10': {
            '1': [
                { chunks: [{ endResidue: 141, startResidue: 1, chainId: 'A', authChainId: 'A', entityId: '1', segment: 1 }], family: '1.10.490.10', familyName: 'Globin-like', id: '1hdaA00', source: 'CATH' },
                { chunks: [{ endResidue: 141, startResidue: 1, chainId: 'C', authChainId: 'C', entityId: '1', segment: 1 }], family: '1.10.490.10', familyName: 'Globin-like', id: '1hdaC00', source: 'CATH' },
            ],
            '2': [
                { chunks: [{ endResidue: 145, startResidue: 1, chainId: 'B', authChainId: 'B', entityId: '2', segment: 1 }], family: '1.10.490.10', familyName: 'Globin-like', id: '1hdaB00', source: 'CATH' },
                { chunks: [{ endResidue: 145, startResidue: 1, chainId: 'D', authChainId: 'D', entityId: '2', segment: 1 }], family: '1.10.490.10', familyName: 'Globin-like', id: '1hdaD00', source: 'CATH' },
            ],
        },
    },
    Pfam: {
        'PF00042': {
            '1': [
                { chunks: [{ endResidue: 136, startResidue: 26, chainId: 'A', authChainId: 'A', entityId: '1', segment: 1 }], family: 'PF00042', familyName: 'Globin', id: 'PF00042_1', source: 'Pfam' },
                { chunks: [{ endResidue: 136, startResidue: 26, chainId: 'C', authChainId: 'C', entityId: '1', segment: 1 }], family: 'PF00042', familyName: 'Globin', id: 'PF00042_3', source: 'Pfam' },
            ],
            '2': [
                { chunks: [{ endResidue: 140, startResidue: 24, chainId: 'B', authChainId: 'B', entityId: '2', segment: 1 }], family: 'PF00042', familyName: 'Globin', id: 'PF00042_2', source: 'Pfam' },
                { chunks: [{ endResidue: 140, startResidue: 24, chainId: 'D', authChainId: 'D', entityId: '2', segment: 1 }], family: 'PF00042', familyName: 'Globin', id: 'PF00042_4', source: 'Pfam' },
            ],
        },
    },
    SCOP: {
        '46463': {
            '1': [

                { chunks: [{ endResidue: 141, startResidue: 1, chainId: 'A', authChainId: 'A', entityId: '1', segment: 1 }], family: '46463', familyName: 'Globins', id: 'd1hdaa_', source: 'SCOP' },
                { chunks: [{ endResidue: 141, startResidue: 1, chainId: 'C', authChainId: 'C', entityId: '1', segment: 1 }], family: '46463', familyName: 'Globins', id: 'd1hdac_', source: 'SCOP' },
            ],
            '2': [
                { chunks: [{ endResidue: 145, startResidue: 1, chainId: 'B', authChainId: 'B', entityId: '2', segment: 1 }], family: '46463', familyName: 'Globins', id: 'd1hdab_', source: 'SCOP' },
                { chunks: [{ endResidue: 145, startResidue: 1, chainId: 'D', authChainId: 'D', entityId: '2', segment: 1 }], family: '46463', familyName: 'Globins', id: 'd1hdad_', source: 'SCOP' },
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
                    '1': [{ chunks: [{ endResidue: 141, startResidue: 1, chainId: 'A', authChainId: 'A', entityId: '1', segment: 1 }], family: '1.10.490.10', familyName: 'Globin-like', id: '1hdaA00', source: 'CATH' }],
                    '2': [{ chunks: [{ endResidue: 145, startResidue: 1, chainId: 'B', authChainId: 'B', entityId: '2', segment: 1 }], family: '1.10.490.10', familyName: 'Globin-like', id: '1hdaB00', source: 'CATH' }],
                },
            },
            Pfam: {
                'PF00042': {
                    '1': [{ chunks: [{ endResidue: 136, startResidue: 26, chainId: 'A', authChainId: 'A', entityId: '1', segment: 1 }], family: 'PF00042', familyName: 'Globin', id: 'PF00042_1', source: 'Pfam' }],
                    '2': [{ chunks: [{ endResidue: 140, startResidue: 24, chainId: 'B', authChainId: 'B', entityId: '2', segment: 1 }], family: 'PF00042', familyName: 'Globin', id: 'PF00042_2', source: 'Pfam' }],
                },
            },
            SCOP: {
                '46463': {
                    '1': [{ chunks: [{ endResidue: 141, startResidue: 1, chainId: 'A', authChainId: 'A', entityId: '1', segment: 1 }], family: '46463', familyName: 'Globins', id: 'd1hdaa_', source: 'SCOP' }],
                    '2': [{ chunks: [{ endResidue: 145, startResidue: 1, chainId: 'B', authChainId: 'B', entityId: '2', segment: 1 }], family: '46463', familyName: 'Globins', id: 'd1hdab_', source: 'SCOP' }],
                },
            },
        } as ReturnType<typeof selectBestChainForDomains>);

        expect(selectBestChainForDomains(DOMAINS_BY_ENTITY_1HDA, { 'A': 100, 'B': 200, 'C': 95, 'D': 202 })).toEqual({
            CATH: {
                '1.10.490.10': {
                    '1': [{ chunks: [{ endResidue: 141, startResidue: 1, chainId: 'A', authChainId: 'A', entityId: '1', segment: 1 }], family: '1.10.490.10', familyName: 'Globin-like', id: '1hdaA00', source: 'CATH' }],
                    '2': [{ chunks: [{ endResidue: 145, startResidue: 1, chainId: 'D', authChainId: 'D', entityId: '2', segment: 1 }], family: '1.10.490.10', familyName: 'Globin-like', id: '1hdaD00', source: 'CATH' }],
                },
            },
            Pfam: {
                'PF00042': {
                    '1': [{ chunks: [{ endResidue: 136, startResidue: 26, chainId: 'A', authChainId: 'A', entityId: '1', segment: 1 }], family: 'PF00042', familyName: 'Globin', id: 'PF00042_1', source: 'Pfam' }],
                    '2': [{ chunks: [{ endResidue: 140, startResidue: 24, chainId: 'D', authChainId: 'D', entityId: '2', segment: 1 }], family: 'PF00042', familyName: 'Globin', id: 'PF00042_4', source: 'Pfam' }],
                },
            },
            SCOP: {
                '46463': {
                    '1': [{ chunks: [{ endResidue: 141, startResidue: 1, chainId: 'A', authChainId: 'A', entityId: '1', segment: 1 }], family: '46463', familyName: 'Globins', id: 'd1hdaa_', source: 'SCOP' }],
                    '2': [{ chunks: [{ endResidue: 145, startResidue: 1, chainId: 'D', authChainId: 'D', entityId: '2', segment: 1 }], family: '46463', familyName: 'Globins', id: 'd1hdad_', source: 'SCOP' }],
                },
            },
        } as ReturnType<typeof selectBestChainForDomains>);

    });


    it('sortDomainsByChain', async () => {
        expect(sortDomainsByChain(DOMAINS_BY_ENTITY_1HDA)).toEqual({
            'A': {
                CATH: {
                    '1.10.490.10': [
                        { chunks: [{ endResidue: 141, startResidue: 1, chainId: 'A', authChainId: 'A', entityId: '1', segment: 1 }], family: '1.10.490.10', familyName: 'Globin-like', id: '1hdaA00', source: 'CATH' },
                    ],
                },
                Pfam: {
                    'PF00042': [
                        { chunks: [{ endResidue: 136, startResidue: 26, chainId: 'A', authChainId: 'A', entityId: '1', segment: 1 }], family: 'PF00042', familyName: 'Globin', id: 'PF00042_1', source: 'Pfam' },
                    ],
                },
                SCOP: {
                    '46463': [
                        { chunks: [{ endResidue: 141, startResidue: 1, chainId: 'A', authChainId: 'A', entityId: '1', segment: 1 }], family: '46463', familyName: 'Globins', id: 'd1hdaa_', source: 'SCOP' },
                    ],
                },
            },
            'B': {
                CATH: {
                    '1.10.490.10': [
                        { chunks: [{ endResidue: 145, startResidue: 1, chainId: 'B', authChainId: 'B', entityId: '2', segment: 1 }], family: '1.10.490.10', familyName: 'Globin-like', id: '1hdaB00', source: 'CATH' },
                    ],
                },
                Pfam: {
                    'PF00042': [
                        { chunks: [{ endResidue: 140, startResidue: 24, chainId: 'B', authChainId: 'B', entityId: '2', segment: 1 }], family: 'PF00042', familyName: 'Globin', id: 'PF00042_2', source: 'Pfam' },
                    ],
                },
                SCOP: {
                    '46463': [
                        { chunks: [{ endResidue: 145, startResidue: 1, chainId: 'B', authChainId: 'B', entityId: '2', segment: 1 }], family: '46463', familyName: 'Globins', id: 'd1hdab_', source: 'SCOP' },
                    ],
                },
            },
            'C': {
                CATH: {
                    '1.10.490.10': [
                        { chunks: [{ endResidue: 141, startResidue: 1, chainId: 'C', authChainId: 'C', entityId: '1', segment: 1 }], family: '1.10.490.10', familyName: 'Globin-like', id: '1hdaC00', source: 'CATH' },
                    ],
                },
                Pfam: {
                    'PF00042': [
                        { chunks: [{ endResidue: 136, startResidue: 26, chainId: 'C', authChainId: 'C', entityId: '1', segment: 1 }], family: 'PF00042', familyName: 'Globin', id: 'PF00042_3', source: 'Pfam' },
                    ],
                },
                SCOP: {
                    '46463': [
                        { chunks: [{ endResidue: 141, startResidue: 1, chainId: 'C', authChainId: 'C', entityId: '1', segment: 1 }], family: '46463', familyName: 'Globins', id: 'd1hdac_', source: 'SCOP' },
                    ],
                },
            },
            'D': {
                CATH: {
                    '1.10.490.10': [
                        { chunks: [{ endResidue: 145, startResidue: 1, chainId: 'D', authChainId: 'D', entityId: '2', segment: 1 }], family: '1.10.490.10', familyName: 'Globin-like', id: '1hdaD00', source: 'CATH' },
                    ],
                },
                Pfam: {
                    'PF00042': [
                        { chunks: [{ endResidue: 140, startResidue: 24, chainId: 'D', authChainId: 'D', entityId: '2', segment: 1 }], family: 'PF00042', familyName: 'Globin', id: 'PF00042_4', source: 'Pfam' },
                    ],
                },
                SCOP: {
                    '46463': [
                        { chunks: [{ endResidue: 145, startResidue: 1, chainId: 'D', authChainId: 'D', entityId: '2', segment: 1 }], family: '46463', familyName: 'Globins', id: 'd1hdad_', source: 'SCOP' },
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
