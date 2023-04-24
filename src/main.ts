/**
 * Copyright (c) 2023 EMBL - European Bioinformatics Institute, licensed under Apache 2.0, see LICENSE file for more info.
 *
 * @author Adam Midlik <midlik@gmail.com>
 */

import { ArgumentParser } from 'argparse';
import fs from 'fs';
import gl from 'gl';
import path from 'path';
import pngjs from 'pngjs';

import { MAQualityAssessment } from 'molstar/lib/commonjs/extensions/model-archive/quality-assessment/behavior';
import { PDBeStructureQualityReport } from 'molstar/lib/commonjs/extensions/pdbe';
import { HeadlessPluginContext } from 'molstar/lib/commonjs/mol-plugin/headless-plugin-context';
import { DefaultPluginSpec, PluginSpec } from 'molstar/lib/commonjs/mol-plugin/spec';
import { HeadlessScreenshotHelperOptions, RawImageData, STYLIZED_POSTPROCESSING, defaultCanvas3DParams, defaultImagePassParams } from 'molstar/lib/commonjs/mol-plugin/util/headless-screenshot';
import { setFSModule } from 'molstar/lib/commonjs/mol-util/data-source';

import { PDBeAPI } from './api';
import { ImageSpec } from './captions/captions';
import { collectCaptions } from './captions/collect';
import { MoljStateSaver, fetchUrl, gunzipData, parseIntStrict } from './helpers/helpers';
import { LogLevel, LogLevels, configureLogging, getLogger, oneLine } from './helpers/logging';
import { ImageGenerator, ImageType, ImageTypes, Mode, Modes } from './image-generator';
import { addAxisIndicators } from './image/draw';
import { resizeRawImage, saveRawToPng } from './image/resize';


const logger = getLogger(module);
setFSModule(fs);


const DEFAULT_PDBE_API_URL = 'https://www.ebi.ac.uk/pdbe/api';

/** ${id} will be replaced by actual identifier (PDB ID or AlphaFoldDB ID) */
const DEFAULT_INPUT_URL_TEMPLATES: { [mode in Mode]: string } = {
    pdb: 'https://www.ebi.ac.uk/pdbe/entry-files/download/${id}.bcif',
    alphafold: 'https://alphafold.ebi.ac.uk/files/${id}.cif', // There is some issue with AlphaFold bcifs, this might be fixed in the future
};
const DEFAULT_IMAGE_SIZE = '800x800';


export interface Args {
    entry_id: string,
    output_dir: string,
    input: string | undefined,
    input_public: string | undefined,
    mode: Mode,
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
    log: LogLevel,
}

export function parseArguments(): Args {
    const parser = new ArgumentParser({ description: 'PDBeImages, a CLI tool for generating images of macromolecular models.' });
    // ArgumentParser will convert `-` to `_` in optional args but not in positional.
    parser.add_argument('entry_id', { help: 'Entry identifier (PDB ID or AlphaFoldDB ID).' });
    parser.add_argument('output_dir', { help: 'Output directory.' });
    parser.add_argument('--input', { help: 'Input structure file or URL (.cif, .bcif, .cif.gz, .bcif.gz).' });
    parser.add_argument('--input-public', { help: 'Input structure URL to use in saved Mol* states (.molj files) (cif or bcif format).' });
    parser.add_argument('--mode', { choices: [...Modes], default: 'pdb', help: 'Mode.' });
    parser.add_argument('--api-url', { default: DEFAULT_PDBE_API_URL, help: `PDBe API URL. Default: ${DEFAULT_PDBE_API_URL}.` });
    parser.add_argument('--no-api', { action: 'store_true', help: 'Do not use PDBe API at all (some images will be skipped, some entity names will be different in captions, etc.).' });
    parser.add_argument('--size', { nargs: '*', default: [DEFAULT_IMAGE_SIZE], help: `One or more output image sizes, e.g. 800x800 200x200. Default: ${DEFAULT_IMAGE_SIZE}. Oonly the first size is rendered, others are obtained by resizing unless --render_each_size is used.` });
    parser.add_argument('--render-each-size', { action: 'store_true', help: 'Render image for each size listed in --size, instead of rendering only the first size and resampling to the other sizes.' });
    parser.add_argument('--type', { nargs: '*', choices: [...ImageTypes], default: ['all'], help: 'One or more image types to be created. Use "all" as a shortcut for all types. See README.md for details on image types. Default: all.' }); // TODO describe image types in README.md
    parser.add_argument('--view', { choices: ['front', 'all', 'auto'], default: 'auto', help: 'Select which views should be created for each image type (front view / all views (front, side, top) / auto (creates all views only for these image types: entry, assembly, entity, modres, plddt)). Default: auto.' });
    parser.add_argument('--opaque-background', { action: 'store_true', help: 'Render opaque background in images (default: transparent background).' });
    parser.add_argument('--no-axes', { action: 'store_true', help: 'Do not render axis indicators aka PCA arrows (default: render axes when rendering the same scene from multiple view angles (front, side, top))' });
    parser.add_argument('--date', { help: `Date to use as "last_modification" in the caption JSON (default: today's date formatted as YYYY-MM-DD)` });
    parser.add_argument('--clear', { action: 'store_true', help: 'Remove all contents of the output directory before running' });
    parser.add_argument('--log', { choices: [...LogLevels], type: (s: string) => s.toUpperCase(), default: 'INFO', help: 'Set logging level. Default: INFO.' });
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
    configureLogging(args.log, 'stderr');
    logger.info('Arguments:', oneLine(args));

    const defaultUrl = DEFAULT_INPUT_URL_TEMPLATES[args.mode].replace(/\$\{id\}/g, args.entry_id); // replace ${id} by actual ID
    let runtimeUrl = resolveUrl(args.input) ?? defaultUrl;
    const publicUrl = args.input_public ?? defaultUrl;

    if (args.clear) {
        fs.rmSync(args.output_dir, { recursive: true, force: true });
    }
    fs.mkdirSync(args.output_dir, { recursive: true });

    if (runtimeUrl.startsWith('file://')) {
        const inputFile = runtimeUrl.substring('file://'.length);
        if (!fs.existsSync(inputFile)) {
            logger.fatal(`Input file not found: ${inputFile}`);
            throw new Error(`Input file not found: ${inputFile}`);
        }
    }

    let tmpStructureFile: string | undefined = undefined;
    if (runtimeUrl.endsWith('.gz')) {
        tmpStructureFile = path.resolve(args.output_dir, runtimeUrl.slice(runtimeUrl.lastIndexOf('/') + 1, runtimeUrl.length - '.gz'.length));
        logger.info(`Input seems to be gzipped (${runtimeUrl}), decompressing to ${tmpStructureFile}`);
        const compressed = await fetchUrl(runtimeUrl);
        const uncompressed = await gunzipData(compressed);
        fs.writeFileSync(tmpStructureFile, uncompressed);
        runtimeUrl = 'file://' + tmpStructureFile;
    }

    const api = new PDBeAPI(args.api_url, args.no_api);
    const plugin = await createHeadlessPlugin(args);
    try {
        const saveFunction = makeSaveFunction(plugin, args.output_dir, args, publicUrl);
        const imageGenerator = new ImageGenerator(plugin, saveFunction, api, args.type, args.view);
        await imageGenerator.processAll(args.entry_id, runtimeUrl, args.mode);
        if (tmpStructureFile) fs.rmSync(tmpStructureFile, { force: true });
        collectCaptions(args.output_dir, args.entry_id, args.date);
    } finally {
        plugin.dispose();
    }
}

export function makeSaveFunction(plugin: HeadlessPluginContext, outDir: string, args: Pick<Args, 'size' | 'render_each_size' | 'no_axes'>, wwwUrl: string) {
    const stateSaver = new MoljStateSaver(plugin, {
        downloadUrl: wwwUrl,
        downloadBinary: wwwUrl.endsWith('.bcif'),
        pdbeStructureQualityReportServerUrl: null, // will use Mol* default https://www.ebi.ac.uk/pdbe/api/validation/residuewise_outlier_summary/entry/
    });
    const postprocessing = undefined;
    return async (spec: ImageSpec) => {
        logger.info('Saving', spec.filename);
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
}


async function createHeadlessPlugin(args: Pick<Args, 'size' | 'opaque_background'>) {
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
    const plugin = new HeadlessPluginContext({ gl, pngjs }, pluginSpec, canvasSize, options);

    try {
        await plugin.init();
    } catch (error) {
        plugin.dispose();
        throw error;
    }
    return plugin;
}

/** If `urlOrPath` is URL, return it.
 * Otherwise assume it is a path and prepend 'file://' */
function resolveUrl(urlOrPath: string | undefined) {
    if (!urlOrPath) return urlOrPath;
    if (urlOrPath.match(/^\w+:\/\//)) return urlOrPath; // is URL
    else return 'file://' + path.resolve(urlOrPath); // is path
}
