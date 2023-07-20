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
    entry_id: string,
    output_dir: string,
    input: string | undefined,
    input_public: string | undefined,
    mode: Mode,
    api_url: string,
    api_retry: boolean,
    no_api: boolean,
    size: { width: number, height: number }[],
    render_each_size: boolean,
    type: ImageType[],
    view: 'front' | 'all' | 'auto',
    opaque_background: boolean,
    no_axes: boolean,
    show_hydrogens: boolean,
    show_branched_sticks: boolean,
    ensemble_shades: boolean,
    allow_lowest_quality: boolean,
    date: string | undefined,
    clear: boolean,
    log: LogLevel,
}
