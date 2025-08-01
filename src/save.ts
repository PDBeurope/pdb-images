/**
 * Copyright (c) 2023-2025 EMBL - European Bioinformatics Institute, licensed under Apache 2.0, see LICENSE file for more info.
 *
 * @author Adam Midlik <midlik@gmail.com>
 */

import fs from 'fs';

import { HeadlessPluginContext } from 'molstar/lib/commonjs/mol-plugin/headless-plugin-context';
import { RawImageData } from 'molstar/lib/commonjs/mol-plugin/util/headless-screenshot';

import { Args } from './args';
import { ImageSpec } from './captions/captions';
import { MoljStateSaver } from './helpers/helpers';
import { getLogger } from './helpers/logging';
import { addAxisIndicators } from './image/draw';
import { saveImage } from './image/resize';
import * as Paths from './paths';


const logger = getLogger(module);


/** Return a function that takes ImageSpec object and produces all types of output files (.png/.webp, .molj, .caption.json) for the current plugin state */
export function makeSaveFunction(plugin: HeadlessPluginContext, outDir: string, args: Pick<Args, 'format' | 'size' | 'render_each_size' | 'no_axes'>, wwwUrl: string) {
    const stateSaver = new MoljStateSaver(plugin, {
        downloadUrl: wwwUrl,
        downloadBinary: wwwUrl.endsWith('.bcif'),
        pdbeStructureQualityReportServerUrl: null, // will use Mol* default https://www.ebi.ac.uk/pdbe/api/validation/residuewise_outlier_summary/entry/
    });
    const postprocessing = undefined;
    return async (spec: ImageSpec) => {
        logger.info('Saving', spec.filename);
        fs.writeFileSync(Paths.imageCaptionJson(outDir, spec.filename), JSON.stringify(spec, undefined, 2), { encoding: 'utf8' });
        await stateSaver.save(Paths.imageStateMolj(outDir, spec.filename));

        const imageSizes = Array.from(args.size).sort((a, b) => b.width * b.height - a.width * a.height); // Sort from largest to smallest
        let image: RawImageData | undefined = undefined;

        for (const size of imageSizes) {
            if (!image || args.render_each_size) {
                // Render new image
                plugin.canvas3d!.commit(true);
                image = await plugin.getImageRaw(size, postprocessing);
                if (!args.no_axes) {
                    addAxisIndicators(image, spec._view);
                }
            }
            for (const format of args.format) {
                const filepath = Paths.image(outDir, spec.filename, format, size);
                await saveImage(image, filepath, size);
            }
        }
    };
}
