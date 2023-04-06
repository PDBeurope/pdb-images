import fs from 'fs';
import gl from 'gl';
import { MAQualityAssessment } from 'molstar/lib/commonjs/extensions/model-archive/quality-assessment/behavior';
import { PDBeStructureQualityReport } from 'molstar/lib/commonjs/extensions/pdbe';

import { CIF, CifFrame } from 'molstar/lib/commonjs/mol-io/reader/cif';
import { trajectoryFromMmCIF } from 'molstar/lib/commonjs/mol-model-formats/structure/mmcif';
import { Model, Structure } from 'molstar/lib/commonjs/mol-model/structure';
import { PluginContext } from 'molstar/lib/commonjs/mol-plugin/context';
import { HeadlessPluginContext } from 'molstar/lib/commonjs/mol-plugin/headless-plugin-context';
import { DefaultPluginSpec, PluginSpec } from 'molstar/lib/commonjs/mol-plugin/spec';
import { defaultCanvas3DParams, defaultImagePassParams } from 'molstar/lib/commonjs/mol-plugin/util/headless-screenshot';
import { Task } from 'molstar/lib/commonjs/mol-task';
import { setFSModule } from 'molstar/lib/commonjs/mol-util/data-source';


export const TESTING_PDBS = ['1hda', '1tqn'] as const;
export type TestingPdb = typeof TESTING_PDBS[number]



export async function getTestingHeadlessPlugin(): Promise<HeadlessPluginContext> {
    setFSModule(fs);
    const pluginSpec = DefaultPluginSpec()
    pluginSpec.behaviors.push(PluginSpec.Behavior(PDBeStructureQualityReport));
    pluginSpec.behaviors.push(PluginSpec.Behavior(MAQualityAssessment));
    const plugin = new HeadlessPluginContext({ gl }, pluginSpec, { width: 800, height: 800 }, { canvas: defaultCanvas3DParams(), imagePass: defaultImagePassParams() });
    await plugin.init();
    return plugin;
}

export async function getTestingPlugin(): Promise<PluginContext> {
    return await getTestingHeadlessPlugin() as PluginContext;
}

export async function getTestingModel(pdbId: TestingPdb): Promise<Model> {
    const fileName = `./test_data/structures/${pdbId}.cif`;
    const content = fs.readFileSync(fileName, { encoding: 'utf8' });
    const comp = CIF.parse(content);
    const parsed = await comp.run();
    if (parsed.isError) throw parsed;
    const cif = parsed.result;
    const trajectory = await trajectoryFromMmCIF(cif.blocks[0] as CifFrame).run();
    const model = await Task.resolveInContext(trajectory.getFrameAtIndex(0));
    return model;
}

export async function getTestingStructure(pdbId: TestingPdb): Promise<Structure> {
    const model = await getTestingModel(pdbId);
    const structure = Structure.ofModel(model);
    return structure;
}