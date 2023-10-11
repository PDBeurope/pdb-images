#!/usr/bin/env node

/**
 * Copyright (c) 2023 EMBL - European Bioinformatics Institute, licensed under Apache 2.0, see LICENSE file for more info.
 *
 * @author Adam Midlik <midlik@gmail.com>
 */

import { ArgumentParser } from 'argparse';
import fs from 'fs';

import { CIF } from 'molstar/lib/commonjs/mol-io/reader/cif';
import { parsePDB } from 'molstar/lib/commonjs/mol-io/reader/pdb/parser';
import { CifWriter } from 'molstar/lib/commonjs/mol-io/writer/cif';
import { Encoder } from 'molstar/lib/commonjs/mol-io/writer/cif/encoder';
import { pdbToMmCif } from 'molstar/lib/commonjs/mol-model-formats/structure/pdb/to-cif';

import { VERSION } from '../main';


/** Command line argument values for `main` */
interface Args {
    /** Input PDB file */
    input: string,
    /** Output CIF file */
    output: string,
}

/** Return parsed command line arguments for `main` */
function parseArguments(): Args {
    const parser = new ArgumentParser({ description: 'pdb2cif converts a PDB format file into mmCIF format. This is an experimental feature and should not be relied on!' });
    parser.add_argument('-v', '--version', { action: 'version', version: VERSION, help: 'Print version info and exit.' });
    parser.add_argument('input', { help: 'Input PDB file.' });
    parser.add_argument('output', { help: 'Output CIF file.' });
    const args = parser.parse_args();
    return { ...args };
}

/** Converts a PDB format file into mmCIF format */
async function main(args: Args) {
    console.log(`Converting PDB to CIF: ${args.input} -> ${args.output}`);
    const pdbData = fs.readFileSync(args.input, { encoding: 'utf8' });
    const cifData = await pdbToCif(pdbData, 'structure');
    fs.writeFileSync(args.output, cifData);
    console.log('Done');
}

/** Converts contents of a PDB format file into mmCIF string */
async function pdbToCif(pdbInput: string, id: string): Promise<string> {
    const parsed = await parsePDB(pdbInput, id).run();
    if (parsed.isError) throw new Error(`Failed to parse PDB file: ${parsed.message}`);
    const cif = await pdbToMmCif(parsed.result);
    const database = CIF.schema.mmCIF(cif);
    const encoder = CifWriter.createEncoder({ binary: false });
    Encoder.writeDatabase(encoder, id, database as any);
    const cifOutput = encoder.getData() as string;
    return cifOutput;
}


main(parseArguments());
