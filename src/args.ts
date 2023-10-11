/**
 * Copyright (c) 2023 EMBL - European Bioinformatics Institute, licensed under Apache 2.0, see LICENSE file for more info.
 *
 * @author Adam Midlik <midlik@gmail.com>
 */

import { LogLevel } from './helpers/logging';


/** Modes of operation of PDBImages */
export const Modes = ['pdb', 'alphafold'] as const;
/** Modes of operation of PDBImages */
export type Mode = typeof Modes[number]

/** Types of images that can be generated */
export const ImageTypes = ['entry', 'assembly', 'entity', 'domain', 'ligand', 'modres', 'bfactor', 'validation', 'plddt', 'all'] as const;
/** Types of images that can be generated */
export type ImageType = typeof ImageTypes[number]

/** Types of images that can be generated for each mode */
export const ImageTypesForModes = {
    'pdb': ['entry', 'assembly', 'entity', 'domain', 'ligand', 'modres', 'bfactor', 'validation'],
    'alphafold': ['plddt'],
} satisfies { [mode in Mode]: ImageType[] };


/** Command line argument values for `main` */
export interface Args {
    /** Entry identifier (PDB ID or AlphaFoldDB ID) */
    entry_id: string,
    /** Output directory */
    output_dir: string,
    /** Input structure file path or URL (.cif, .bcif, .cif.gz, .bcif.gz); `undefined` to download from a public source */
    input: string | undefined,
    /** Input structure URL to use in saved Mol* states (.molj files) (cif or bcif format); `undefined` to use default public source (PDBe/AlphafoldDB) */
    input_public: string | undefined,
    /** Mode */
    mode: Mode,
    /** PDBe API URL */
    api_url: string,
    /** Retry any failed API call up to 5 times, waiting random time (up to 30 seconds) before each retry */
    api_retry: boolean,
    /** Do not use PDBe API at all (some images will be skipped, some entity names will be different in captions, etc.) */
    no_api: boolean,
    /** One or more output image sizes. Only the largest size is rendered, others are obtained by resizing unless `render_each_size` is true. Use without any value to disable image rendering (only create captions and MOLJ files). */
    size: { width: number, height: number }[],
    /** Render image for each size listed in `size`, instead of rendering only the first size and resampling to the other sizes */
    render_each_size: boolean,
    /** One or more image types to be created. Use "all" as a shortcut for all types. See README.md for details on image types. Use without any value to skip all types (only create summary files from existing outputs). */
    type: ImageType[],
    /** Select which views should be created for each image type (front view / all views (front, side, top) / auto (creates all views only for these image types: entry, assembly, entity, modres, plddt)) */
    view: 'front' | 'all' | 'auto',
    /** Render opaque background in images (default: transparent background) */
    opaque_background: boolean,
    /** Do not render axis indicators aka PCA arrows (default: render axes when rendering the same scene from multiple view angles (front, side, top)) */
    no_axes: boolean,
    /** Show hydrogen atoms in ball-and-stick visuals (default: always ignore hydrogen atoms) */
    show_hydrogens: boolean,
    /** Show semi-transparent ball-and-stick visuals for branched entities (i.e. carbohydrates) in addition to the default 3D-SNFG visuals */
    show_branched_sticks: boolean,
    /** Show individual models within an ensemble in different shades of the base color (lighter and darker), default: use the same colors for all models */
    ensemble_shades: boolean,
    /** Allow any quality level for visuals, including 'lowest', which is really ugly (default: allow only 'lower' quality level and better) */
    allow_lowest_quality: boolean,
    /** Force outputting 'bfactor' image type even if the structure is not from X-ray (this might be necessary for custom mmCIF files with missing information about experimental methods) */
    force_bfactor: boolean,
    /** Date to use as "last_modification" in the caption JSON; `undefined` to use today's date formatted as YYYY-MM-DD */
    date: string | undefined,
    /** Remove all contents of the output directory before running */
    clear: boolean,
    /** Logging level */
    log: LogLevel,
}

export type OptionalArgs = Omit<Args, 'entry_id' | 'output_dir'>

/** Default values for `Args` */
export const Defaults = {
    input: undefined,
    input_public: undefined,
    mode: 'pdb',
    api_url: 'https://www.ebi.ac.uk/pdbe/api',
    api_retry: false,
    no_api: false,
    size: [{ width: 800, height: 800 }],
    render_each_size: false,
    type: ['all'],
    view: 'auto',
    opaque_background: false,
    no_axes: false,
    show_hydrogens: false,
    show_branched_sticks: false,
    ensemble_shades: false,
    allow_lowest_quality: false,
    force_bfactor: false,
    date: undefined,
    clear: false,
    log: 'INFO',
} satisfies OptionalArgs;

/** Create `Args` object to pass to `main` */
export function createArgs(
    /** Entry identifier (PDB ID or AlphaFoldDB ID) */
    entry_id: string,
    /** Output directory */
    output_dir: string,
    /** Optional arguments */
    options: Partial<OptionalArgs> = {}): Args {
    return { ...Defaults, ...options, entry_id, output_dir };
}
