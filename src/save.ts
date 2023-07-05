/**
 * Copyright (c) 2023 EMBL - European Bioinformatics Institute, licensed under Apache 2.0, see LICENSE file for more info.
 *
 * @author Adam Midlik <midlik@gmail.com>
 */

import fs from 'fs';
import path from 'path';

import { HeadlessPluginContext } from 'molstar/lib/commonjs/mol-plugin/headless-plugin-context';
import { RawImageData } from 'molstar/lib/commonjs/mol-plugin/util/headless-screenshot';

import { ImageSpec } from './captions/captions';
import { MoljStateSaver } from './helpers/helpers';
import { getLogger } from './helpers/logging';
import { addAxisIndicators } from './image/draw';
import { resizeRawImage, saveRawToPng } from './image/resize';
import { Args } from './main';


const logger = getLogger(module);


/** Return a function that takes ImageSpec object and produces all types of output files (.png, .molj, .caption.json) for the current plugin state */
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

        const imageSizes = Array.from(args.size).sort((a, b) => b.width * b.height - a.width * a.height); // Sort from largest to smallest
        let fullsizeImage: RawImageData | undefined = undefined;

        for (const size of imageSizes) {
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
