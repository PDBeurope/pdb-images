/**
 * Copyright (c) 2023 EMBL - European Bioinformatics Institute, licensed under Apache 2.0, see LICENSE file for more info.
 *
 * @author Adam Midlik <midlik@gmail.com>
 */

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
import { RawImageData, defaultCanvas3DParams, defaultImagePassParams } from 'molstar/lib/commonjs/mol-plugin/util/headless-screenshot';
import { Task } from 'molstar/lib/commonjs/mol-task';
import { setFSModule } from 'molstar/lib/commonjs/mol-util/data-source';


export const TESTING_PDBS = ['1hda', '1ad5', '176d', 'AF-Q8W3K0-F1-model_v4'] as const;
export type TestingPdb = typeof TESTING_PDBS[number];
/** Timeout for long-running tests (in ms) */
export const LONG_TEST_TIMEOUT = 600_000;


export async function getTestingHeadlessPlugin(): Promise<HeadlessPluginContext> {
    setFSModule(fs);
    const pluginSpec = DefaultPluginSpec();
    pluginSpec.behaviors.push(PluginSpec.Behavior(PDBeStructureQualityReport));
    pluginSpec.behaviors.push(PluginSpec.Behavior(MAQualityAssessment));
    const plugin = new HeadlessPluginContext({ gl }, pluginSpec, { width: 100, height: 100 }, { canvas: defaultCanvas3DParams(), imagePass: defaultImagePassParams() });
    try {
        await plugin.init();
    } catch (error) {
        plugin.dispose();
        throw error;
    }
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

/** Check whether all pixels in the image are the same */
export function isImageBlank(image: RawImageData): boolean {
    const { width, height, data } = image;
    if (width * height === 0) return true;
    const r0 = data[0];
    const g0 = data[0];
    const b0 = data[0];
    const a0 = data[0];
    for (let offset = 0; offset < data.length; offset += 4) { // 4 channels
        if (data[offset] !== r0) return false;
        if (data[offset + 1] !== g0) return false;
        if (data[offset + 2] !== b0) return false;
        if (data[offset + 3] !== a0) return false;
    }
    return true;
}

/** Check whether all pixels in the "border" of the image (i.e. first and last row and column) are the same */
export function isBorderBlank(image: RawImageData): boolean {
    const { width, height, data } = image;
    if (width * height === 0) return true;
    const r0 = data[0];
    const g0 = data[0];
    const b0 = data[0];
    const a0 = data[0];
    for (let offset = 0; offset < 4 * width; offset += 4) { // first row
        if (data[offset] !== r0) return false;
        if (data[offset + 1] !== g0) return false;
        if (data[offset + 2] !== b0) return false;
        if (data[offset + 3] !== a0) return false;
    }
    for (let offset = data.length - 4 * width; offset < data.length; offset += 4) { // last row
        if (data[offset] !== r0) return false;
        if (data[offset + 1] !== g0) return false;
        if (data[offset + 2] !== b0) return false;
        if (data[offset + 3] !== a0) return false;
    }
    for (let offset = 0; offset < data.length; offset += 4 * width) { // first column
        if (data[offset] !== r0) return false;
        if (data[offset + 1] !== g0) return false;
        if (data[offset + 2] !== b0) return false;
        if (data[offset + 3] !== a0) return false;
    }
    for (let offset = 4 * width - 4; offset < data.length; offset += 4 * width) { // last column
        if (data[offset] !== r0) return false;
        if (data[offset + 1] !== g0) return false;
        if (data[offset + 2] !== b0) return false;
        if (data[offset + 3] !== a0) return false;
    }
    return true;
}

/** Get version from the package.json file */
export function versionFromPackageJson(): string {
    const packageJsonString = fs.readFileSync('./package.json', { encoding: 'utf-8' });
    const packageJson = JSON.parse(packageJsonString);
    return packageJson.version;
}
