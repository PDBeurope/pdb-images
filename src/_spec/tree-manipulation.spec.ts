/**
 * Copyright (c) 2023 EMBL - European Bioinformatics Institute, licensed under Apache 2.0, see LICENSE file for more info.
 *
 * @author Adam Midlik <midlik@gmail.com>
 */

import { PluginContext } from 'molstar/lib/commonjs/mol-plugin/context';
import { Color } from 'molstar/lib/commonjs/mol-util/color';

import { PDBeAPI } from '../api';
import { getEntityInfo } from '../helpers/structure-info';
import { RootNode, using } from '../tree-manipulation';
import { getTestingHeadlessPlugin } from './_utils';


const DOWNLOAD_PARAMS = { url: 'file://./test_data/structures/1hda.cif', isBinary: false };
const DOWNLOAD_PARAMS_BCIF = { url: 'file://./test_data/structures/1hda.bcif', isBinary: true };
const DOWNLOAD_PARAMS_3D11 = { url: 'file://./test_data/structures/3d11.cif', isBinary: false };
const DOWNLOAD_PARAMS_ALPHAFOLD = { url: 'file://./test_data/structures/AF-Q8W3K0-F1-model_v4.cif', isBinary: false };

function getCells(plugin: PluginContext, transformerType?: string) {
    let result = Array.from(plugin.state.data.cells.values());
    if (transformerType) {
        result = result.filter(c => c.transform.transformer.id === transformerType);
    }
    return result;
}

function getTransformerTypes(plugin: PluginContext): string[] {
    return getCells(plugin).map(c => c.transform.transformer.id);
}


describe('basic', () => {
    it('download, parse mmCIF, get model, custom model props', async () => {
        const plugin = await getTestingHeadlessPlugin();
        try {
            const root = RootNode.create(plugin);
            const data = await root.makeDownload(DOWNLOAD_PARAMS, 'testing_1hda');
            expect(getTransformerTypes(plugin)).toContain('ms-plugin.download');
            const cif = await data.makeCif();
            expect(getTransformerTypes(plugin)).toContain('ms-plugin.parse-cif');
            const traj = await cif.makeTrajectory();
            expect(getTransformerTypes(plugin)).toContain('ms-plugin.trajectory-from-mmcif');
            const model = await traj.makeModel(0);
            expect(getTransformerTypes(plugin)).toContain('ms-plugin.model-from-trajectory');
            const customModel = await model.makeCustomModelProperties();
            expect(getTransformerTypes(plugin)).toContain('ms-plugin.custom-model-properties');
            await root.dispose();
            expect(getCells(plugin).filter(c => c.transform.transformer.id !== 'build-in.root')).toHaveLength(0);
        } finally {
            plugin.dispose();
        }
    });

    it('download, parse binary CIF, get model, custom model props', async () => {
        const plugin = await getTestingHeadlessPlugin();
        try {
            const root = RootNode.create(plugin);
            const data = await root.makeDownload(DOWNLOAD_PARAMS_BCIF, 'testing_1hda');
            expect(getTransformerTypes(plugin)).toContain('ms-plugin.download');
            const cif = await data.makeCif();
            expect(getTransformerTypes(plugin)).toContain('ms-plugin.parse-cif');
            const traj = await cif.makeTrajectory();
            expect(getTransformerTypes(plugin)).toContain('ms-plugin.trajectory-from-mmcif');
            const model = await traj.makeModel(0);
            expect(getTransformerTypes(plugin)).toContain('ms-plugin.model-from-trajectory');
            const customModel = await model.makeCustomModelProperties();
            expect(getTransformerTypes(plugin)).toContain('ms-plugin.custom-model-properties');
        } finally {
            plugin.dispose();
        }
    });

    it('using', async () => {
        const plugin = await getTestingHeadlessPlugin();
        try {
            const root = RootNode.create(plugin);
            await using(await root.makeDownload(DOWNLOAD_PARAMS), () => {
                expect(getTransformerTypes(plugin)).toContain('ms-plugin.download');
            });
            expect(getTransformerTypes(plugin)).not.toContain('ms-plugin.download');
        } finally {
            plugin.dispose();
        }
    });

    it('toggle visible, collapsed, ghost', async () => {
        const plugin = await getTestingHeadlessPlugin();
        try {
            const root = RootNode.create(plugin);
            const data = await root.makeDownload(DOWNLOAD_PARAMS);
            expect(getTransformerTypes(plugin)).toContain('ms-plugin.download');

            expect(getCells(plugin, 'ms-plugin.download')[0].state.isHidden).toBeFalsy();
            data.setVisible(false);
            expect(getCells(plugin, 'ms-plugin.download')[0].state.isHidden).toBeTruthy();
            data.setVisible(true);
            expect(getCells(plugin, 'ms-plugin.download')[0].state.isHidden).toBeFalsy();

            expect(getCells(plugin, 'ms-plugin.download')[0].state.isCollapsed).toBeFalsy();
            data.setCollapsed(true);
            expect(getCells(plugin, 'ms-plugin.download')[0].state.isCollapsed).toBeTruthy();
            data.setCollapsed(false);
            expect(getCells(plugin, 'ms-plugin.download')[0].state.isCollapsed).toBeFalsy();

            expect(getCells(plugin, 'ms-plugin.download')[0].state.isGhost).toBeFalsy();
            data.setGhost(true);
            expect(getCells(plugin, 'ms-plugin.download')[0].state.isGhost).toBeTruthy();
            data.setGhost(false);
            expect(getCells(plugin, 'ms-plugin.download')[0].state.isGhost).toBeFalsy();
        } finally {
            plugin.dispose();
        }
    });

});


describe('structure', () => {
    it('makeStructure "model"', async () => {
        const plugin = await getTestingHeadlessPlugin();
        try {
            const root = RootNode.create(plugin);
            const data = await root.makeDownload(DOWNLOAD_PARAMS);
            const cif = await data.makeCif();
            const traj = await cif.makeTrajectory();
            const model = await traj.makeModel(0);
            const struct = await model.makeStructure({ type: { name: 'model', params: {} } });
            expect(getTransformerTypes(plugin)).toContain('ms-plugin.structure-from-model');
            const realParams = getCells(plugin, 'ms-plugin.structure-from-model')[0].transform.params;
            expect(realParams.type.name).toEqual('model');
        } finally {
            plugin.dispose();
        }
    });

    it('makeStructure "assembly"', async () => {
        const plugin = await getTestingHeadlessPlugin();
        try {
            const root = RootNode.create(plugin);
            const data = await root.makeDownload(DOWNLOAD_PARAMS);
            const cif = await data.makeCif();
            const traj = await cif.makeTrajectory();
            const model = await traj.makeModel(0);
            const struct = await model.makeStructure({ type: { name: 'assembly', params: { id: '1' } } });
            expect(getTransformerTypes(plugin)).toContain('ms-plugin.structure-from-model');
            const realParams = getCells(plugin, 'ms-plugin.structure-from-model')[0].transform.params;
            expect(realParams.type.name).toEqual('assembly');
            expect(realParams.type.params.id).toEqual('1');
        } finally {
            plugin.dispose();
        }
    });
});


describe('substructures', () => {
    it('makeStandardComponents, makeLigEnvComponents, makeSubstructures', async () => {
        const plugin = await getTestingHeadlessPlugin();
        try {
            const root = RootNode.create(plugin);
            const data = await root.makeDownload(DOWNLOAD_PARAMS);
            const cif = await data.makeCif();
            const traj = await cif.makeTrajectory();
            const model = await traj.makeModel(0);
            const struct = await model.makeStructure({ type: { name: 'model', params: {} } });

            const stdComps = await struct.makeStandardComponents();
            expect(getTransformerTypes(plugin)).toContain('ms-plugin.structure-component');
            expect(getCells(plugin, 'ms-plugin.structure-component').map(c => c.obj?.description))
                .toEqual(['4386 elements', '212 elements']);
            await stdComps.dispose();
            expect(getTransformerTypes(plugin)).not.toContain('ms-plugin.structure-component');

            const ligEnvComps = await struct.makeLigEnvComponents({ compId: 'HEM', chainId: 'E', authChainId: 'A', entityId: '2', description: 'Heme', nInstancesInEntry: 4 });
            expect(getTransformerTypes(plugin)).toContain('ms-plugin.structure-component');
            expect(getCells(plugin, 'ms-plugin.structure-component').map(c => c.obj?.description))
                .toEqual(['43 elements', '180 elements', '489 elements', '2 elements']);
            await ligEnvComps.dispose();
            expect(getTransformerTypes(plugin)).not.toContain('ms-plugin.structure-component');

            const substructs = await struct.makeSubstructures({
                domain: { kind: 'domain', chainId: 'A', ranges: [[1, 100], [120, 140]] },
                residues: { kind: 'sets', sets: { 'A': [100, 105], 'B': [101], 'C': [120] } },
            });
            expect(getTransformerTypes(plugin)).toContain('ms-plugin.structure-component');
            expect(getCells(plugin, 'ms-plugin.structure-component').map(c => c.obj?.description))
                .toEqual(['911 elements', '29 elements']);
        } finally {
            plugin.dispose();
        }
    });

    it('group, makeChain, makeAuthChain', async () => {
        const plugin = await getTestingHeadlessPlugin();
        try {
            const root = RootNode.create(plugin);
            const data = await root.makeDownload(DOWNLOAD_PARAMS);
            const cif = await data.makeCif();
            const traj = await cif.makeTrajectory();
            const model = await traj.makeModel(0);
            const struct = await model.makeStructure({ type: { name: 'model', params: {} } });
            const group = await struct.makeGroup({ label: 'Testing group', description: 'a nice one' });
            expect(getTransformerTypes(plugin)).toContain('ms-plugin.create-group');
            const chainA = await group.makeChain('A', 'A');
            const chainAuthB = await group.makeAuthChain('B', 'B');
            expect(getTransformerTypes(plugin)).toContain('ms-plugin.structure-component');
            expect(getCells(plugin, 'ms-plugin.structure-component').map(c => c.obj?.description))
                .toEqual(['1066 elements', '1178 elements']);
        } finally {
            plugin.dispose();
        }
    });

    it('entities', async () => {
        const plugin = await getTestingHeadlessPlugin();
        try {
            const root = RootNode.create(plugin);
            const data = await root.makeDownload(DOWNLOAD_PARAMS);
            const cif = await data.makeCif();
            const traj = await cif.makeTrajectory();
            const model = await traj.makeModel(0);
            const struct = await model.makeStructure({ type: { name: 'model', params: {} } });

            const entities = await struct.makeEntities(getEntityInfo(struct.data!));
            expect(getTransformerTypes(plugin)).toContain('ms-plugin.structure-component');
            expect(getCells(plugin, 'ms-plugin.structure-component').map(c => c.obj?.description))
                .toEqual(['2132 elements', '2254 elements', '172 elements', '42 elements']);
        } finally {
            plugin.dispose();
        }
    });
});


describe('visuals', () => {
    it('carbohydrate', async () => {
        const plugin = await getTestingHeadlessPlugin();
        try {
            const root = RootNode.create(plugin);
            const data = await root.makeDownload(DOWNLOAD_PARAMS_3D11);
            const cif = await data.makeCif();
            const traj = await cif.makeTrajectory();
            const model = await traj.makeModel(0);
            const struct = await model.makeStructure({ type: { name: 'model', params: {} } });
            const visual = await struct.makeCarbohydrate();

            expect(getTransformerTypes(plugin)).toContain('ms-plugin.structure-representation-3d');
            const realParams = getCells(plugin, 'ms-plugin.structure-representation-3d')[0].transform.params;
            expect(realParams.type.name).toEqual('carbohydrate');
        } finally {
            plugin.dispose();
        }
    });

    it('makeStandardVisuals', async () => {
        const plugin = await getTestingHeadlessPlugin();
        try {
            const root = RootNode.create(plugin);
            const data = await root.makeDownload(DOWNLOAD_PARAMS_3D11);
            const cif = await data.makeCif();
            const traj = await cif.makeTrajectory();
            const model = await traj.makeModel(0);
            const struct = await model.makeStructure({ type: { name: 'model', params: {} } });

            const stdComps = await struct.makeStandardComponents();
            await using(stdComps.makeStandardVisuals(), visuals => {
                expect(getTransformerTypes(plugin)).toContain('ms-plugin.structure-representation-3d');
                expect(getCells(plugin, 'ms-plugin.structure-representation-3d').map(c => c.params?.values.type.name))
                    .toEqual(['cartoon', 'carbohydrate', 'ball-and-stick', 'ball-and-stick']);
            });
            expect(getTransformerTypes(plugin)).not.toContain('ms-plugin.structure-representation-3d');
        } finally {
            plugin.dispose();
        }
    });

    it('makeLigEnvComponents', async () => {
        const plugin = await getTestingHeadlessPlugin();
        try {
            const root = RootNode.create(plugin);
            const data = await root.makeDownload(DOWNLOAD_PARAMS);
            const cif = await data.makeCif();
            const traj = await cif.makeTrajectory();
            const model = await traj.makeModel(0);
            const struct = await model.makeStructure({ type: { name: 'model', params: {} } });

            const ligEnvComps = await struct.makeLigEnvComponents({ compId: 'HEM', chainId: 'E', authChainId: 'A', entityId: '2', description: 'Heme', nInstancesInEntry: 4 });
            await using(ligEnvComps.makeLigEnvVisuals(), visuals => {
                expect(getTransformerTypes(plugin)).toContain('ms-plugin.structure-representation-3d');
                expect(getCells(plugin, 'ms-plugin.structure-representation-3d').map(c => c.params?.values.type.name))
                    .toEqual(['ball-and-stick', 'ball-and-stick', 'ball-and-stick', 'cartoon']);
            });
            expect(getTransformerTypes(plugin)).not.toContain('ms-plugin.structure-representation-3d');
        } finally {
            plugin.dispose();
        }
    });

    it('changing visuals', async () => {
        const plugin = await getTestingHeadlessPlugin();
        try {
            const root = RootNode.create(plugin);
            const data = await root.makeDownload(DOWNLOAD_PARAMS);
            const cif = await data.makeCif();
            const traj = await cif.makeTrajectory();
            const model = await traj.makeModel(0);
            const customModel = await model.makeCustomModelProperties(new PDBeAPI('file://./test_data/api'));
            const struct = await customModel.makeStructure({ type: { name: 'model', params: {} } });
            const visual = await struct.makeCartoon();
            expect(getTransformerTypes(plugin)).toContain('ms-plugin.structure-representation-3d');
            let realParams;
            realParams = getCells(plugin, 'ms-plugin.structure-representation-3d')[0].transform.params;
            expect(realParams.type.name).toEqual('cartoon');
            expect(realParams.colorTheme.name).toEqual('unit-index');

            await visual.setColorUniform(Color(1234));
            realParams = getCells(plugin, 'ms-plugin.structure-representation-3d')[0].transform.params;
            expect(realParams.colorTheme.name).toEqual('uniform');
            expect(realParams.colorTheme.params.value).toEqual(1234);

            await visual.setColorByEntity();
            realParams = getCells(plugin, 'ms-plugin.structure-representation-3d')[0].transform.params;
            expect(realParams.colorTheme.name).toEqual('entity-id');

            await visual.setColorByChainId();
            realParams = getCells(plugin, 'ms-plugin.structure-representation-3d')[0].transform.params;
            expect(realParams.colorTheme.name).toEqual('chain-id');

            await visual.setColorByChainInstance();
            realParams = getCells(plugin, 'ms-plugin.structure-representation-3d')[0].transform.params;
            expect(realParams.colorTheme.name).toEqual('unit-index');

            await visual.setColorByBfactor();
            realParams = getCells(plugin, 'ms-plugin.structure-representation-3d')[0].transform.params;
            expect(realParams.colorTheme.name).toEqual('uncertainty');

            await visual.setColorByGeometryValidation();
            realParams = getCells(plugin, 'ms-plugin.structure-representation-3d')[0].transform.params;
            expect(realParams.colorTheme.name).toEqual('pdbe-structure-quality-report');

            await visual.setOpacity(0.5);
            realParams = getCells(plugin, 'ms-plugin.structure-representation-3d')[0].transform.params;
            expect(realParams.type.params.alpha).toEqual(0.5);

            await visual.setPutty();
            realParams = getCells(plugin, 'ms-plugin.structure-representation-3d')[0].transform.params;
            expect(realParams.type.name).toEqual('putty');

            await visual.setCartoon();
            realParams = getCells(plugin, 'ms-plugin.structure-representation-3d')[0].transform.params;
            expect(realParams.type.name).toEqual('cartoon');

            await visual.setHighlight(Color(1234));
            realParams = getCells(plugin, 'ms-plugin.structure-representation-3d')[0].transform.params;
            expect(realParams.colorTheme.name).toEqual('uniform');
            expect(realParams.colorTheme.params.value).toEqual(1234);
        } finally {
            plugin.dispose();
        }
    });

    it('changing visuals - plddt', async () => {
        const plugin = await getTestingHeadlessPlugin();
        try {
            const root = RootNode.create(plugin);
            const data = await root.makeDownload(DOWNLOAD_PARAMS_ALPHAFOLD);
            const cif = await data.makeCif();
            const traj = await cif.makeTrajectory();
            const model = await traj.makeModel(0);
            const customModel = await model.makeCustomModelProperties(new PDBeAPI('file://./test_data/api'));
            const struct = await customModel.makeStructure({ type: { name: 'model', params: {} } });
            const visual = await struct.makeCartoon();
            expect(getTransformerTypes(plugin)).toContain('ms-plugin.structure-representation-3d');
            let realParams;
            realParams = getCells(plugin, 'ms-plugin.structure-representation-3d')[0].transform.params;
            expect(realParams.type.name).toEqual('cartoon');
            expect(realParams.colorTheme.name).toEqual('unit-index');

            await visual.setColorByPlddt();
            realParams = getCells(plugin, 'ms-plugin.structure-representation-3d')[0].transform.params;
            expect(realParams.colorTheme.name).toEqual('plddt-confidence');
        } finally {
            plugin.dispose();
        }
    });
});
