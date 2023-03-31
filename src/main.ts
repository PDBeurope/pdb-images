// Build: npm run build-tsc
// Run:   node lib/commonjs/cli/pdbe-images --help
//        node lib/commonjs/cli/pdbe-images 1tqn

import { ArgumentParser } from 'argparse';
import fs from 'fs';
import path from 'path';
import { MAQualityAssessment } from 'molstar/lib/extensions/model-archive/quality-assessment/behavior';
import { PDBeStructureQualityReport } from 'molstar/lib/extensions/pdbe';
import { defaultCanvas3DParams, defaultImagePassParams, HeadlessScreenshotHelperOptions, RawImageData, STYLIZED_POSTPROCESSING } from 'molstar/lib/mol-plugin/util/headless-screenshot';
import { HeadlessPluginContext } from 'molstar/lib/mol-plugin/headless-plugin-context';
import { DefaultPluginSpec, PluginSpec } from 'molstar/lib/mol-plugin/spec';

import { PDBeAPI } from './api';
import { ImageSpec } from './captions';
import { collectCaptions } from './captions-collect';
import { NaughtyStateSaver, parseIntStrict } from './helpers/helpers';
import { ImageGenerator } from './image-generator';
import { addAxisIndicators } from './image/draw';
import { resizeRawImage, saveRawToPng } from './image/resize';


const DEFAULT_PDBE_API_URL = 'https://www.ebi.ac.uk/pdbe/api';
const DEFAULT_IMAGE_SIZE = '800x800';


export const ImageTypes = ['entry', 'assembly', 'entity', 'domain', 'ligand', 'modres', 'bfactor', 'validation', 'plddt', 'all'] as const;
export type ImageType = typeof ImageTypes[number]

export interface Args {
    pdbid: string,
    api_url: string,
    no_api: boolean,
    size: { width: number, height: number }[],
    view: 'front' | 'all' | 'auto',
    render_each_size: boolean,
    type: ImageType[],
    opaque_background: boolean,
    no_axes: boolean,
    date: string | undefined,
    clear: boolean,
}

export function parseArguments(): Args {
    const parser = new ArgumentParser({ description: 'CLI tool for generating PDBe images of macromolecular models.' });
    parser.add_argument('pdbid', { help: 'PDB identifier.' }); // TODO replace by infile + outdir
    parser.add_argument('--api_url', { default: DEFAULT_PDBE_API_URL, help: `PDBe API URL. Default: ${DEFAULT_PDBE_API_URL}.` });
    parser.add_argument('--no_api', { action: 'store_true', help: 'Do not use PDBe API at all (some images will be skipped, some entity names will be different in captions, etc.).' });
    parser.add_argument('--size', { nargs: '*', default: [DEFAULT_IMAGE_SIZE], help: `One or more output image sizes, e.g. 800x800 200x200. Default: ${DEFAULT_IMAGE_SIZE}. Oonly the first size is rendered, others are obtained by resizing unless --render_each_size is used.` });
    parser.add_argument('--render_each_size', { action: 'store_true', help: 'Render image for each size listed in --size, instead of rendering only the first size and resampling to the other sizes.' });
    parser.add_argument('--type', { nargs: '*', choices: [...ImageTypes], default: ['all'], help: 'One or more image types to be created. Use "all" as a shortcut for all types. See README.md for details on image types. Default: all.' }); // TODO describe image types in README.md
    parser.add_argument('--view', { choices: ['front', 'all', 'auto'], default: 'auto', help: 'Select which views should be created for each image type (front view / all views (front, side, top) / auto (creates all views only for these image types: entry, assembly, entity, modres, plddt)). Default: auto.' });
    parser.add_argument('--opaque_background', { action: 'store_true', help: 'Render opaque background in images (default: transparent background).' });
    parser.add_argument('--no_axes', { action: 'store_true', help: 'Do not render axis indicators aka PCA arrows (default: render axes when rendering the same scene from multiple view angles (front, side, top))' });
    parser.add_argument('--date', { help: `Date to use as "last_modification" in the caption JSON (default: today's date formatted as YYYY-MM-DD)` });
    parser.add_argument('--clear', { action: 'store_true', help: 'Remove all contents of the output directory before running' });
    const args = parser.parse_args();
    args.size = args.size.map((s: string) => {
        try {
            const parts = s.split('x');
            if (parts.length !== 2) throw new Error('Must contain two x-separated parts');
            return { width: parseIntStrict(parts[0]), height: parseIntStrict(parts[1]) };
        } catch {
            parser.error(`argument: --size: invalid image size string: '${s}' (must be two x-separated integers (width and height), e.g. '400x300')`);
        }
    });
    return { ...args };
}

export async function main(args: Args) {
    console.log('args:', args);

    const rootPath = '/Users/midlik/Workspace/PDBeImages/data';
    const outDir = path.join(rootPath, 'out', args.pdbid);
    if (args.clear) {
        fs.rmSync(outDir, { recursive: true, force: true });
    }
    fs.mkdirSync(outDir, { recursive: true });

    console.time(`generate ${args.pdbid}`);
    const options: HeadlessScreenshotHelperOptions = { canvas: defaultCanvas3DParams(), imagePass: defaultImagePassParams() };
    options.canvas!.camera!.manualReset = true;
    if (options.canvas?.cameraFog?.name === 'on') {
        options.canvas.cameraFog.params.intensity = 30;
    }
    options.canvas!.postprocessing!.occlusion = STYLIZED_POSTPROCESSING.occlusion!;
    options.imagePass!.transparentBackground = !args.opaque_background; // applies only to rendered image (MOLJ always has opaque background)

    const pluginSpec = DefaultPluginSpec();
    pluginSpec.behaviors.push(PluginSpec.Behavior(PDBeStructureQualityReport));
    pluginSpec.behaviors.push(PluginSpec.Behavior(MAQualityAssessment));

    const canvasSize = args.size[0] ?? { width: 800, height: 800 };
    const plugin = new HeadlessPluginContext(pluginSpec, canvasSize, options);
    await plugin.init();

    const isAlphaFold = args.pdbid.startsWith('AF-'); // for now, TODO pass through args
    if (isAlphaFold) console.log('RUNNING IN ALPHAFOLD MODE');
    const localPath = isAlphaFold
        ? path.join(rootPath, 'in', `${args.pdbid}.cif`)
        : path.join(rootPath, 'in', `${args.pdbid}.bcif`);
    const localUrl = 'file://' + localPath;
    const wwwUrl = isAlphaFold
        ? `https://alphafold.ebi.ac.uk/files/${args.pdbid}.cif` // e.g. https://alphafold.ebi.ac.uk/files/AF-Q8W3K0-F1-model_v4.bcif
        : `https://www.ebi.ac.uk/pdbe/entry-files/download/${args.pdbid}.bcif`;
    // There is some issue with AlphaFold bcifs, this might be fixed in the future
    const format = localUrl.endsWith('.cif') ? 'cif' : 'bcif';

    if (!fs.existsSync(localPath)) throw new Error(`Input file not found: ${localPath}`);

    const stateSaver = new NaughtyStateSaver(plugin, { downloadUrl: wwwUrl, pdbeStructureQualityReportServerUrl: null });
    const postprocessing = undefined;
    const saveFunction = async (spec: ImageSpec) => {
        fs.writeFileSync(path.join(outDir, `${spec.filename}.caption.json`), JSON.stringify(spec, undefined, 2), { encoding: 'utf8' });
        await stateSaver.save(path.join(outDir, `${spec.filename}.molj`));

        let fullsizeImage: RawImageData | undefined = undefined;
        for (const size of args.size) {
            let image: RawImageData;
            if (args.render_each_size || !fullsizeImage) {
                // Render new image
                plugin.canvas3d!.commit(true);
                image = await plugin.renderer.getImageRaw(size, postprocessing);
                if (!args.no_axes) {
                    addAxisIndicators(image, spec._view);
                }
                fullsizeImage ??= image;
            } else {
                // Resize existing image
                image = resizeRawImage(fullsizeImage, size);
            }
            await saveRawToPng(image, path.join(outDir, `${spec.filename}_image-${size.width}x${size.height}.png`));
        }
    };
    const api = new PDBeAPI(args.api_url, args.no_api);

    const imageGenerator = new ImageGenerator(plugin, saveFunction, api, args.type, args.view);
    await imageGenerator.processUrl(localUrl, args.pdbid, format, isAlphaFold ? 'alphafold' : 'pdb');
    collectCaptions(outDir, args.pdbid, args.date);

    plugin.dispose();

    console.timeEnd(`generate ${args.pdbid}`);
}
