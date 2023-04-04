import fs from 'fs';
import gl from 'gl';

import { CIF, CifFrame } from 'molstar/lib/commonjs/mol-io/reader/cif';
import { trajectoryFromMmCIF } from 'molstar/lib/commonjs/mol-model-formats/structure/mmcif';
import { Model, Structure } from 'molstar/lib/commonjs/mol-model/structure';
import { PluginContext } from 'molstar/lib/commonjs/mol-plugin/context';
import { HeadlessPluginContext } from 'molstar/lib/commonjs/mol-plugin/headless-plugin-context';
import { DefaultPluginSpec } from 'molstar/lib/commonjs/mol-plugin/spec';
import { defaultCanvas3DParams, defaultImagePassParams } from 'molstar/lib/commonjs/mol-plugin/util/headless-screenshot';
import { Task } from 'molstar/lib/commonjs/mol-task';


export const TESTING_PDBS = ['1hda', '1tqn'] as const;
export type TestingPdb = typeof TESTING_PDBS[number]



export function getTestingPlugin(): PluginContext {
    return new HeadlessPluginContext({ gl }, DefaultPluginSpec(), { width: 800, height: 800 }, { canvas: defaultCanvas3DParams(), imagePass: defaultImagePassParams() });
}

export async function getTestingModel(pdbId: TestingPdb): Promise<Model> {
    const fileName = `./test_data/${pdbId}.cif`;
    const content = fs.readFileSync(fileName, {encoding: 'utf8'});
    const comp = CIF.parse(content);
    const parsed = await comp.run();
    if (parsed.isError) throw parsed;
    const cif = parsed.result;
    const trajectory = await trajectoryFromMmCIF(cif.blocks[0] as CifFrame).run();
    const model = await Task.resolveInContext(trajectory.getFrameAtIndex(0));
    return model;
}

export async function getTestingStructure(pdbId: TestingPdb): Promise<Structure>{
    const model = await getTestingModel(pdbId)
    const structure = Structure.ofModel(model);
    return structure;
}