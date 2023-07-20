/**
 * Copyright (c) 2023 EMBL - European Bioinformatics Institute, licensed under Apache 2.0, see LICENSE file for more info.
 *
 * @author Adam Midlik <midlik@gmail.com>
 */

import { ChainIndex } from 'molstar/lib/commonjs/mol-model/structure';
import { getTestingModel, getTestingStructure } from '../../_spec/_utils';
import { countChainResidues, getChainInfo, getElementsInChains, getEntityInfo, getLigandInfo } from '../structure-info';

describe('structure-info', () => {
    it('getEntityInfo', async () => {
        const struct = await getTestingStructure('1hda');
        expect(getEntityInfo(struct)).toEqual({
            1: {
                chains: [0, 1],
                description: 'HEMOGLOBIN (DEOXY) (ALPHA CHAIN)',
                index: 0,
                type: 'polymer',
            },
            2: {
                chains: [2, 3],
                description: 'HEMOGLOBIN (DEOXY) (BETA CHAIN)',
                index: 1,
                type: 'polymer',
            },
            3: {
                chains: [4, 5, 6, 7],
                description: 'PROTOPORPHYRIN IX CONTAINING FE',
                index: 2,
                type: 'non-polymer',
            },
            4: {
                chains: [8],
                description: 'water',
                index: 3,
                type: 'water',
            }
        });
    });

    it('getElementsInChains', async () => {
        const struct = await getTestingStructure('1hda');
        expect(getElementsInChains(struct, [])).toEqual([]);
        expect(getElementsInChains(struct, [0 as ChainIndex])).toEqual(['C', 'N', 'O', 'S']);
        expect(getElementsInChains(struct, [0 as ChainIndex, 4 as ChainIndex])).toEqual(['C', 'FE', 'N', 'O', 'S']);
    });

    it('getLigandInfo', async () => {
        const struct = await getTestingStructure('1hda');
        expect(getLigandInfo(struct)).toEqual({
            HEM: {
                authChainId: 'A',
                chainId: 'E',
                compId: 'HEM',
                description: 'PROTOPORPHYRIN IX CONTAINING FE',
                entityId: '3',
                nInstancesInEntry: 4,
            },
        });
    });

    it('countChainResidues', async () => {
        const model = await getTestingModel('1hda');
        expect(countChainResidues(model)).toEqual({
            A: 141, B: 145, C: 141, D: 145, // proteins
            E: 1, F: 1, G: 1, H: 1, // hems
            I: 19, J: 8, K: 10, L: 5 // waters
        });
    });

    it('getChainInfo', async () => {
        const model = await getTestingModel('1hda');
        expect(getChainInfo(model)).toEqual({
            A: { authChainId: 'A', entityId: '1' },
            B: { authChainId: 'B', entityId: '2' },
            C: { authChainId: 'C', entityId: '1' },
            D: { authChainId: 'D', entityId: '2' },
            E: { authChainId: 'A', entityId: '3' },
            F: { authChainId: 'B', entityId: '3' },
            G: { authChainId: 'C', entityId: '3' },
            H: { authChainId: 'D', entityId: '3' },
            I: { authChainId: 'A', entityId: '4' },
            J: { authChainId: 'B', entityId: '4' },
            K: { authChainId: 'C', entityId: '4' },
            L: { authChainId: 'D', entityId: '4' },
        });
    });
});