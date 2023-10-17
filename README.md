# PDBImages

**PDBImages** is a command-line tool for generating images of macromolecular structures from mmCIF or binary CIF structure files based on Mol*.


## Installing as a command-line tool

**PDBImages** is available in the **npm** registry. You can install it globally on your machine (requires Node.js >= 18):

```sh
npm install -g pdb-images
```


## Usage

NOTE: The following examples assume you installed PDBImages globally with `npm install -g pdb-images`. If you installed locally in the current directory (`npm install pdb-images`), use `npx pdb-images` instead of `pdb-images`. If you cloned the git repository and built it, use `node ./lib/cli/pdb-images.js` instead of `pdb-images`.

Print help:

```sh
pdb-images --help
```

Generate all images for PDB entry `1ad5` and save in directory `data/output_1ad5/`, with default settings:

```sh
pdb-images 1ad5 data/output_1ad5/
```

Another example, with all command line arguments given:

```sh
pdb-images 1hda data/output_1hda/ \
    --input test_data/structures/1hda.cif \
    --input-public https://www.ebi.ac.uk/pdbe/entry-files/download/1hda.bcif \
    --mode pdb \
    --api-url https://www.ebi.ac.uk/pdbe/api \
    --api-retry \
    --no-api \
    --size 500x500 300x200 \
    --render-each-size \
    --type entry assembly \
    --view front \
    --opaque-background \
    --no-axes \
    --show-hydrogens \
    --show-branched-sticks \
    --ensemble-shades \
    --allow-lowest-quality \
    --date 2023-04-20 \
    --clear \
    --log DEBUG
```           

### Input

Input is a structure file in mmCIF (`.cif`) or binary CIF (`.bcif`) format. The input file can be also compressed by GZIP (`.cif.gz`, `.bcif.gz`). If the `--input` option is not given, the input file will be retrieved from a public source (`https://www.ebi.ac.uk/pdbe/entry-files/download/{id}.bcif` for PDB mode, `https://alphafold.ebi.ac.uk/files/{id}.cif` for AlphaFold mode). However, for this to work in AlphaFold mode, the user has to specify full identifier of a model in AlphaFold DB, e.g. "AF-Q5VSL9-F1-model_v4", not only "Q5VSL9". There is a persisting issue with `.bcif` files provided by AlphaFold DB (this might be fixed in the future), `.cif` files are processed without problems (therefore the default public source is set to `.cif` for AlphaFold mode).

Supplementary input data will be retrieved from the PDBe API. The default API URL is `https://www.ebi.ac.uk/pdbe/api` but can be changed by the `--api-url` option. The URL can use `http:`, `https:`, or `file:` protocol; using `file:` protocol allows the user to "plug in" custom data from a local directory, e.g. `--api-url 'file://path-to-this-repository/test_data/api'`. When using this approach, the organization of the files in the directory and the format of these file must imitate the PDBe API endpoints; see `test_data/api/` directory for a demonstration. If the program cannot find a specific file in the directory, it will print a warning and proceed as if the API returned an empty JSON response (`{}`). 

Overview of accessed API endpoints (will be prefixed by the API URL and `{id}` will be replaced by the entry ID (i.e. the first command line argument)):
* `/pdb/entry/molecules/{id}` – for entity names in the image captions (not essential)
* `/pdb/entry/summary/{id}` – for preferred assembly information (not essential)
* `/pdb/entry/modified_AA_or_NA/{id}` – for modified residue data (essential for `modres` images)
* `/mappings/{id}`, `/nucleic_mappings/{id}` – for SIFTS domain mappings (essential for `domain` images)
* `/validation/residuewise_outlier_summary/entry/{id}` – for validation report data (essential for `validation` images)

With the `--no-api` option, API will not be used at all. Running without API will affect the program's behavior as follows:
* the image types that vitally depend on the API data (i.e. `domain`, `modres`, `validation`) will not be generated;
* some features can behave slightly differently (entity names for captions will be retrieved from the structure file instead of the API data; `entity` images will be rendered using the first assembly instead of the preferred assembly);
* the final self-check, whether all expected images have been generated, will be skipped.

The legacy PDB file format is not directly supported by `pdb-images`. For convenience, this package provides a script for conversion of PDB files to mmCIF, which can then be passed to `pdb-images`. However, correct behavior with the converted files cannot be guaranteed, as the internal logic of the PDB format is fundamentally different from mmCIF, and this conversion should not be relied on. Use original mmCIF files whenever possible. Usage:

```sh
pdb2cif data/1ad5.pdb data/1ad5.cif
```

### Output

#### Image files

The program creates a collection of image types. Each scene can be rendered in different views (front, side, top; `--view` option) and in different resolutions (`--size` option). Besides the rendered images in PNG format, the program also saves `.molj` files (Mol* plugin states, aka snapshots, which can be loaded in Mol*) and `.caption.json` files (image captions).

(Names of the individual files may be a bit confusing, as they were inherited from an older image generation process. See section *Generated image types* for explanation of the filenames.)

#### Summary files

After generating all images, two summary files are created: 

* `{pdb}_filelist` contains the list of created images
* `{pdb}.json` contains the structured list of created images, including their captions and some other metadata.

These summary files contain filenames without suffixes, e.g. `1ad5_deposited_chain_front` instead of the full filename `1ad5_deposited_chain_front_image-800x800.png`. To get full filenames, you must combine the filenames in the `"image"` sections and the suffixes in the `"image_suffix"` section of the JSON summary file (e.g `1ad5_deposited_chain_front` + `_image-800x800.png` -> `1ad5_deposited_chain_front_image-800x800.png`).

If the output directory contains older files from previous runs, these will also be included in the summary files (run with `--clear` to remove any older files instead). If you only want to update the summary files based on the current contents of the output directory without generating any new images, run with `--type` (without specifying any type).

After creating all output files, the program will perform a self-check, i.e. it will compare the expected list of output files (based purely on API data, agnostic to the structure file) with the actual list of generated output files. In case that any expected file is missing, the program will print an error message, save the expected file list to `{id}_expected_files.txt`, and terminate with a non-zero exit code. This self-check is skipped when using `--no-api`.

### Generated image types

**PDBImages** generates many types of images. By default, it will create all image types that make sense for the selected mode (`pdb`/`alphafold`) and entry. Alternatively, the user can select a subset of image types by the `--type` option. These are all the available types:

* `entry` – Create images of the whole deposited structure, colored by chains and colored by entities (i.e. chemically distinct molecules).
  * –> `{pdb}_deposited_chain_{view}_image-{size}.png`
  * –> `{pdb}_deposited_chemically_distinct_molecules_{view}_image-{size}.png`
* `assembly` – For each assembly listed in the mmCIF file, create images of the whole assembly, colored by chains and colored by entities.
  * –> `{pdb}_assembly_{assembly}_chain_{view}_image-{size}.png`
  * –> `{pdb}_assembly_{assembly}_chemically_distinct_molecules_{view}_image-{size}.png`
* `entity` - For each distinct entity, create an image of the preferred assembly with this entity highlighted. This excludes the water entity. If an entity is not present in the preferred assembly, the program will instead use the first assembly where this entity is present (e.g. entity 5 in 7nys). If an entity is not present in any assembly, the deposited model will be used instead (e.g. entity 3 in 6ml1).
  * –> `{pdb}_entity_{entity}_{view}_image-{size}.png`
* `domain` – Create images for SIFTS mappings (CATH, SCOP, Pfam, Rfam). Namely, for each combination of SIFTS family and entity, select a chain belonging to that entity and create an image of the chain with highlighted SIFTS domain(s). If there are domains from the same family in different entities, process each of them separately. If there are multiple domains from the same family in the same entity but in different chains, process just one of the chains. If there are multiple domains from the same family within one chain, render this chain with each domain highlighted in a different color (choose the chain with most domain in such case). Requires API.
  * –> `{pdb}_{entity}_{chain}_{source}_{family}_image-{size}.png`
* `ligand` – For each distinct non-polymer entity in the structure (with the exception of water), create an image of this molecule highlighted plus its surrounding. If there are multiple instances of the same entity, only process one of them.
  * –> `{pdb}_ligand_{ligand}_image-{size}.png`
* `modres` – For each distinct modified residue in the structure, create an image of the preferred assembly with all instances of this modified residue highlighted. Requires API.
  * –> `{pdb}_modres_{modres}_{view}_image-{size}.png`
* `bfactor` – Create an image of the deposited structure in putty representation with color-coded B-factors. Skip if the structure is not from a diffraction method (thus B-factors are not available).
  * –> `{pdb}_bfactor_image-{size}.png`
* `validation` – Create an image of the deposited structure with color-coded validation data. Requires API.
  * –> `{pdb}_validation_geometry_deposited_image-{size}.png`
* `plddt` – Create an image of the deposited structure with color-coded pLDDT values. This is only for `--mode alphafold`.
  * –> `{pdb}_modres_{modres}_image-{size}.png`
* `all` – A shortcut to create all meaningful image types (i.e. all but `plddt` in `pdb` mode, `plddt` in `alphafold` mode).

By default, some image types are rendered in three views (front, side, top view) with axis arrows shown in the left bottom corner, while other image types are only rendered in front view without axis arrows. This can be changed by the `--view` and `--no-axes` options.

By default, the images are rendered in one resolution, 800x800. This can be changed by the `--size` option. If multiple sizes are provided (e.g. `--size 100x100 800x800 1600x1600`), only the largest size (measured by area) will be rendered and the others will be obtained by resizing (use `--render_each_size` to render each size separately). 
If you use `--size` without any value, no PNG images will be rendered but captions (`.caption.json`) and state files (`.molj`) will still be created.

### Overview of the command-line arguments

```
positional arguments:
  entry_id              Entry identifier (PDB ID or AlphaFoldDB ID).
  output_dir            Output directory.

optional arguments:
  -h, --help            show this help message and exit
  -v, --version         Print version info and exit.
  --input INPUT         Input structure file path or URL (.cif, .bcif,
                        .cif.gz, .bcif.gz).
  --input-public INPUT_PUBLIC
                        Input structure URL to use in saved Mol* states (.molj
                        files) (cif or bcif format).
  --mode {pdb,alphafold}
                        Mode.
  --api-url API_URL     PDBe API URL (can use http:, https:, or file: protocol).
                        Default: https://www.ebi.ac.uk/pdbe/api.
  --api-retry           Retry any failed API call up to 5 times, waiting
                        random time (up to 30 seconds) before each retry.
  --no-api              Do not use PDBe API at all (some images will be
                        skipped, some entity names will be different in
                        captions, etc.).
  --size [SIZE ...]     One or more output image sizes, e.g. 800x800 200x200.
                        Default: 800x800. Only the largest size is rendered,
                        others are obtained by resizing unless
                        --render_each_size is used. Use without any value to
                        disable image rendering (only create captions and MOLJ
                        files).
  --render-each-size    Render image for each size listed in --size, instead
                        of rendering only the first size and resampling to the
                        other sizes.
  --type [{entry,assembly,entity,domain,ligand,modres,bfactor,validation,plddt,all} ...]
                        One or more image types to be created. Use "all" as a
                        shortcut for all types. See README.md for details on
                        image types. Default: all. Use without any value to
                        skip all types (only create summary files from
                        existing outputs).
  --view {front,all,auto}
                        Select which views should be created for each image
                        type (front view / all views (front, side, top) / auto
                        (creates all views only for these image types: entry,
                        assembly, entity, modres, plddt)). Default: auto.
  --opaque-background   Render opaque background in images (default:
                        transparent background).
  --no-axes             Do not render axis indicators aka PCA arrows (default:
                        render axes when rendering the same scene from
                        multiple view angles (front, side, top)).
  --show-hydrogens      Show hydrogen atoms in ball-and-stick visuals
                        (default: always ignore hydrogen atoms).
  --show-branched-sticks
                        Show semi-transparent ball-and-stick visuals for
                        branched entities (i.e. carbohydrates) in addition to
                        the default 3D-SNFG visuals.
  --ensemble-shades     Show individual models within an ensemble in different
                        shades of the base color (lighter and darker),
                        default: use the same colors for all models.
  --allow-lowest-quality
                        Allow any quality level for visuals, including
                        "lowest", which is really ugly (default: allow only
                        "lower" quality level and better).
  --force-bfactor       Force outputting "bfactor" image type even if the structure is
                        not from X-ray (this might be necessary for custom mmCIF files 
                        with missing information about experimental methods).
  --date DATE           Date to use as "last_modification" in the caption JSON
                        (default: today's date formatted as YYYY-MM-DD).
  --clear               Remove all contents of the output directory before
                        running.
  --log {ALL,TRACE,DEBUG,INFO,WARN,ERROR,FATAL,MARK,OFF}
                        Set logging level. Default: INFO.
```


## Run in Docker

NOTE: Docker image for PDBImages uses Xvfb, which results in much worse performance compared to running it directly on a machine with GPU (see FAQ).

### Get image from repository and run

```sh
docker run -v ~/data/output_1ad5:/out pdbegroup/pdb-images 1ad5 /out
```

### Build and run

```sh
docker build . -t pdb-images                         # if you run it on the same architecture as build
docker build . -t pdb-images --platform linux/amd64  # if you need it for a different architecture
docker run -v ~/data/output_1ad5:/out pdb-images 1ad5 /out
```

### Run in Singularity

```sh
singularity build ./pdb-images docker://pdbegroup/pdb-images
singularity run --env XVFB_DIR=~/data/xvfb ./pdb-images 1ad5 ~/data/output_1ad5
```

It is important to set `XVFB_DIR` variable to an existing mounted directory (use `--bind` if paths are not mounted automatically). When running multiple jobs in parallel, set a separate `XVFB_DIR` for each job.


## Including as a dependency

**PDBImages** is available in the **npm** registry. You can add it as a dependency to your own package (requires Node.js >= 18):

```sh
npm install pdb-images
```

Then you can call the asynchronous `main` function (and others) in your code. This example shows how to call `main` from TypeScript code:

```typescript
import { createArgs } from 'pdb-images/lib/args';
import { main } from 'pdb-images/lib/main';

main(createArgs('1ad5', 'data/output_1ad5/', { size: [{ width: 1600, height: 1200 }], view: 'front', clear: true }));
```

In TypeScript configuration (`tsconfig.js`) use `"module": "CommonJS"`.


## Development

### Install dependencies

```sh
npm install
```

Requires Node.js >= 18. See FAQ if installation fails on the `gl` package.

### Build

```sh
rm -rf ./lib/  # For a clean build
npm run build
```

Build automatically on file save:

```sh
npm run watch
```

### Test

```sh
npm run lint
npm run jest
```

### Release

To release a new version of this package:

* Change version in `package.json`
* Change version in `src/main.ts` (`export const VERSION = ...`)
* Run tests (will check if the versions match)
* Update `CHANGELOG.md`
* Commit and push to `main` branch (use the version as the commit message, e.g. `2.0.0`)
* Create a git tag using semantic versioning (e.g. `2.0.0`); do not start the tag with "v" (e.g. `v2.0.0`)
* GitHub workflow will automatically publish npm package (https://www.npmjs.com/package/pdb-images)
* GitHub workflow will automatically publish Docker images (https://hub.docker.com/r/pdbegroup/pdb-images and dockerhub.ebi.ac.uk/pdbe/packages/pdb-images)


## FAQ

- **`npm install` fails on the `gl` package, printing something like:**

  ```
  ...
  npm ERR! gyp ERR! not ok
  ...
  ```
  
  This is probably because some dependencies needed to build the `gl` package are missing and/or Python path is not set correctly. Try this:
  
  ```sh
  sudo apt-get install -y build-essential libxi-dev libglu1-mesa-dev libglew-dev pkg-config
  export NODE_GYP_FORCE_PYTHON=$(which python3)
  ```
  
  or follow instructions here: <https://www.npmjs.com/package/gl#system-dependencies>

- **Installation completed successfully and running `pdb-images --help` works fine, but trying to run image generation gives an error like this:**

  ```
          var ext = gl.getExtension('ANGLE_instanced_arrays');
  TypeError: Cannot read properties of null (reading 'getExtension')
  ```
  
  This will be thrown when X server is not available on the machine, which is a common situation in large computing infrastructures or cloud environments. 
  
  The easiest solution is to use `Xvfb` X server: 
  
  ```sh
  sudo apt-get install xvfb
  xvfb-run --auto-servernum pdb-images 1ad5 data/output_1ad5/
  ```
  
  This approach is used for the GitHub testing workflow (`sudo apt-get install xvfb && xvfb-run --auto-servernum npm run jest`). It is also used in the enclosed Dockerfile.
  
  The downside of this approach is that `Xvfb` is a purely software implementation and cannot use GPU (this information cannot be found in any official source but a bunch of people on StackOverflow say so), thus not allowing the full performance potential of PDBImages.

- **Installation completed successfully and running `pdb-images --help` works fine, but trying to run image generation gives an error like this:**

  ```
  ReferenceError: fetch is not defined
  ```

  This is probably because you are using an older version of Node.js. Version 18 or higher is required to run PDBImages.
  
  When you update Node.js, make sure to uninstall the PDBImages package and then install it again: 
  
  ```
  npm uninstall -g pdb-images
  npm install -g pdb-images
  ```

  (use `-g` only if you install globally)
