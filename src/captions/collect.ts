import fs from 'fs';
import path from 'path';
import { ImageSpec } from './captions';


/** Collect captions from all *.caption.json files in `directory` and save them in {pdbId}.json, structured into sections.
 * Also save the list of filenames (without suffixes) in {pdbId}_filelist.
*/
export function collectCaptions(directory: string, pdbId: string, lastModificationDate?: string) {
    const allFiles = fs.readdirSync(directory);
    const captionFiles = allFiles.filter(f => f.endsWith('.caption.json'));
    const result = {} as any;
    const filenameStems = []; // filenames without suffix
    for (const file of captionFiles) {
        const content = fs.readFileSync(path.join(directory, file), { encoding: 'utf8' });
        const spec = JSON.parse(content) as ImageSpec;
        if (spec._entry_id !== pdbId) continue;
        const cleanSpec: Partial<ImageSpec> = {};
        for (const key in spec) {
            if (!key.startsWith('_')) {
                cleanSpec[key as keyof typeof spec] = spec[key as keyof typeof spec] as any;
            }
        }
        const section = getSection(result, spec._section);
        (section['image'] ??= []).push(cleanSpec);
        for (const key in spec._extras) {
            section[key] = spec._extras[key];
        }
        filenameStems.push(spec.filename);
    }
    filenameStems.sort();
    result['image_suffix'] = getCommonSuffixes(allFiles, filenameStems);
    result['last_modification'] = lastModificationDate ?? new Date().toISOString().split(/[T ]/)[0]; // format as 2023-03-21
    fs.writeFileSync(path.join(directory, `${pdbId}.json`), JSON.stringify({ [pdbId]: result }, undefined, 2));
    fs.writeFileSync(path.join(directory, `${pdbId}_filelist`), filenameStems.join('\n'));
}

/** Get the specified section in a nested object `obj`
 * (e.g. `getSection(obj, ['a', 'b', 'c'])` returns `obj.a.b.c`, `getSection(obj, [])` returns `obj`).
 * If at any level in `obj` a key is missing, add that key with value `{}`.
 */
function getSection(obj: any, section: string[]) {
    for (const key of section) {
        obj = (obj[key] ??= {});
    }
    return obj;
}

/** Get the maximal set of suffixes such that each combination of prefix+suffix appears in names.
 */
function getCommonSuffixes(names: string[], prefixes: string[]) {
    const nameSet = new Set(names);
    prefixes = prefixes.slice().sort().reverse(); // sort backwards, so the longest prefix always occurs first
    let allSuffixes = [];
    for (const name of names) {
        const prefix = prefixes.find(p => name.startsWith(p));
        if (!prefix) continue;
        const suffix = name.substring(prefix.length);
        allSuffixes.push(suffix);
    }
    allSuffixes = Array.from(new Set(allSuffixes)).sort();
    const commonSuffixes = new Set(allSuffixes);
    for (const prefix of prefixes) {
        for (const suffix of allSuffixes) {
            if (!nameSet.has(prefix + suffix)) {
                commonSuffixes.delete(suffix);
            }
        }
    }
    return Array.from(commonSuffixes).sort();
}
