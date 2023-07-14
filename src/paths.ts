import path from 'path';


/** Return path for list of created filenames (without suffixes), like `out/1tqn_filelist` */
export function filelist(outDir: string | undefined, entryId: string) {
    return join(outDir, `${entryId}_filelist`);
}

/** Return path for structured image captions and filenames, like `out/1tqn.json` */
export function captionsJson(outDir: string | undefined, entryId: string) {
    return join(outDir, `${entryId}.json`);
}

/** Return path for list of expected filenames, like `out/1tqn_expected_files.txt` */
export function expectedFilelist(outDir: string | undefined, entryId: string) {
    return join(outDir, `${entryId}_expected_files.txt`);
}

/** Return path for saving API data, like `out/1tqn_api_data.json` */
export function apiDataPath(outDir: string | undefined, entryId: string) {
    return join(outDir, `${entryId}_api_data.json`);
}


/** Return path for image captions, like `out/1tqn_deposited_chain_front.captions.json` */
export function imageCaptionJson(outDir: string | undefined, filenameStem: string) {
    return join(outDir, `${filenameStem}.caption.json`);
}

/** Return path for MolStar state, like `out/1tqn_deposited_chain_front.molj` */
export function imageStateMolj(outDir: string | undefined, filenameStem: string) {
    return join(outDir, `${filenameStem}.molj`);
}

/** Return path for image, like `out/1tqn_deposited_chain_front_image-800x800.png` */
export function imagePng(outDir: string | undefined, filenameStem: string, size: { width: number, height: number }) {
    return join(outDir, `${filenameStem}_image-${size.width}x${size.height}.png`);
}


/** Like `path.join` but allow `undefined` (and ignore it) */
function join(...parts: (string | undefined)[]) {
    const definedParts = parts.filter(p => !!p) as string[];
    return path.join(...definedParts);
}
