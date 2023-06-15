# PDBeImages

**PDBeImages** is a command line tool for generating images of macromolecular structures from mmCIF or binary CIF structure files based on Mol*.


## Development

### Install dependencies

```sh
npm install
```

(See FAQ if installation fails on the `gl` package.)

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

## Including as dependency

**PDBeImages** is available in the NPM registry. You can add it as a dependency to your own package:

```sh
npm install pdbe-images
```

## Installing as CLI tool

**PDBeImages** is available in the NPM registry. You can install it globally on your machine:

```sh
npm install -g pdbe-images
```


## Usage

NOTE: The following examples assume you installed PDBeImages globally with `npm install -g pdbe-images`. If you installed locally in the current directory (`npm install pdbe-images`), use `npx pdbe-images` instead of `pdbe-images`. If you cloned the git repository and built it, use `node ./lib/cli/pdbe-images.js` instead of `pdbe-images`

Print help:

```sh
pdbe-images --help
```

Generate all images for PDB entry `1ad5` and save in directory `data/output_1ad5/`, with default settings:

```sh
pdbe-images 1ad5 data/output_1ad5/
```

Another example, with all command line arguments given:

```sh
pdbe-images 1hda data/output_1hda/ \
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
    --date 2023-04-20 \
    --clear \
    --log DEBUG
```           

### Input

Input is a structure file in mmCIF (`.cif`) or binary CIF (`.bcif`) format. The input file can be also compressed by GZIP (`.cif.gz`, `.bcif.gz`). If the `--input` option is not given, the input file will be retrieved from a public source (`https://www.ebi.ac.uk/pdbe/entry-files/download/${id}.bcif` for PDB mode, `https://alphafold.ebi.ac.uk/files/${id}.cif` for AlphaFold mode). There is some issue with AlphaFold bcifs, this might be fixed in the future.

Additional input data will be retrieved from a PDBe API (default `https://www.ebi.ac.uk/pdbe/api`, can be changed by the `--api-url` option). With `--no-api` option, API will not be used at all – as a result, some image types will not be generated or captions will be slightly different.

### Output

#### Image files

The program creates a collection of image types. Each scene can be rendered in different views (front, side, top; `--view` argument) and in different resolutions (`--size` argument). Besides the rendered images in PNG format, the program also saves `.molj` files (Mol* plugin states, aka snapshots, which can be loaded in Mol*) and `.caption.json` files (image captions).

#### Summary files
 
After generating all images, two summary files are created: 

* `{pdb}_filelist` contains the list of created images (without file suffixes, i.e. `1ad5_deposited_chain_front` instead of `1ad5_deposited_chain_front_image-800x800.png`)
* `{pdb}.json` contains the structured list of created images, including their captions and some other metadata.

If the output directory contains older files from previous runs, these will also be included in the summary files (run with `--clear` to remove any older files instead).

(File names may be a bit confusing, they were inherited from an older image generation process.)

### Generated image types

**PDBeImages** generates many types of images. By default, it will create all image types that make sense for the selected mode (`pdb`/`alphafold`) and entry. Alternatively, the user can select a subset of image types by the option `--type`. These are all the available types:

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

By default, some image types are rendered in three views (front, side, top view) with axis arrows shown in the left bottom corner, while other image types are only rendered in front view without axis arrows. This can be changed by `--view` and `--no-axes` arguments.


## Run in Docker

NOTE: Docker image for PDBeImages uses Xvfb, which results in much worse performance compared to running it directly on a machine with GPU (see FAQ).

### Get image from repository and run

```sh
docker run -v ~/data/output_1ad5:/out midlik/pdbe-images:amd64 1ad5 /out
```

### Build and run

```sh
docker build . -t pdbe-images                         # if you run it on the same architecture as build
docker build . -t pdbe-images --platform linux/amd64  # if you need it for a different architecture
docker run -v ~/data/output_1ad5:/out pdbe-images 1ad5 /out
```

### Run in Singularity

```sh
singularity build ./pdbe-images docker://midlik/pdbe-images:amd64
singularity run --env XVFB_DIR=~/data/xvfb ./pdbe-images 1ad5 ~/data/output_1ad5
```

It is important to set `XVFB_DIR` variable to an existing mounted directory (use `--bind` if paths are not mounted automatically). When running multiple jobs in parallel, set a separate `XVFB_DIR` for each job.


## FAQ

- `npm install` fails on the `gl` package, printing something like:

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

- Installation completed successfully and running `pdbe-images --help` works fine, but trying to run image generation gives an error like this:

  ```
          var ext = gl.getExtension('ANGLE_instanced_arrays');
  TypeError: Cannot read properties of null (reading 'getExtension')
  ```
  
  This will be thrown when X server is not available on the machine, which is a common situation in large computing infrastructures or cloud environments. 
  
  The easiest solution is to use `Xvfb` X server: 
  
  ```sh
  sudo apt-get install xvfb
  xvfb-run --auto-servernum pdbe-images 1ad5 data/output_1ad5/
  ```
  
  This approach is used for the GitHub testing workflow (`sudo apt-get install xvfb && xvfb-run --auto-servernum npm run jest`). It is also used in the enclosed Dockerfile.
  
  The downside of this approach is that `Xvfb` is a purely software implementation and cannot use GPU (this information cannot be found in any official source but a bunch of people on StackOverflow say so), thus not allowing the full performance potential of PDBeImages.
