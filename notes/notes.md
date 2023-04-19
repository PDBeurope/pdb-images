## Benchmarking dataset

Here: https://gitlab.ebi.ac.uk/midlik/pdb-visualization-benchmark

## DONE

- Orient in Mol* 3.34


## TODO

- Ask David about Struct_conn extension implementation:
  - Is it OK to expose function/method directly in app.ts? (it will require that the extension be packed in the bundle); 
    Alternatively it could be only in an extension and OneDep would instantiate that extension instead of viewer? But that would create duplication of code!
  - Is it OK to have the extension without having it in GUI? (thus it would not even be an extension, just an exposed function)

- Check entries from Genovieve (weird/failed on April 12): 8agd 7y01 7xyq 8e5t 8bf8 8h1j 8g9o 8g9n 8g9l 8f24
- Solve pref.ass. in API (e.g. 1tqn, 1l7c, 1ad9?)
- Short peptides - show cartoon or sticks? Large structures - show cartoon or surface? What is the threshold? -> keep the current behaviour and double-check if it's OK
- Testing - unit tests (for the pure functions) + check a few entries if all images get generated and are not blank (check image size); use Jest - before packaging
- Documentation
- Packaging (1. move to a new repo on GitHub/EBIGitLab (ask Sreenath/Stephen), 2. make npm-installable)
- PDBE-4487 Add carb image to image gallery on branched page??? -> this was requested by Mandar but makes no sense, discuss with Mandar+Misi
- Collapsing nodes in tree (low prio)
- Allow config file for rendering settings (fog, occlusion...)?

- Aesthetic test?:
  - Aren't colors with occlusion too dark??
  - Cartoon helix profile: elliptical vs rounded
  - Cartoon - sizeFactor and aspectRatio (compare to PyMOL)
  - Cartoon - bumps to show something?? (maybe distiquish domains?)
  - Fog?
  - resolution 1600, 1200, 800


## Questions:

- Changed assemblies in summary API (tetramer 1tqn)
- struct_conn plan

- Mandar - why images in collapsed gallery are all 200x200, and thumbnails in open gallery all 800x800
- Misi - remove ticket?: PDBE-4487 Add carb image to image gallery on branched page


## Suggestions:



## Resolved:

- Ligand environment radius (current process has 4, Mol* has 5) -> use 5
- Validation - current process uses different API endpoints (missed RSRZ outliers), I will stick to Mol*
- B-factor - not showing surface
- EM densities - look at pdbe-images repo (by Lukas?) - don't worry now, we probably don't need them
- Multi-model entries - show all models or e.g. only first 20? -> render all
- B-factor using plasma colormap, could be blue-white-red (default) or rainbow (default in Pymol I think) -> use rainbow
- B-factor - where is it on the web? -> currently nowhere, we will put it there in the future (more focus on validation wanted)
- How much memory is available in production? (7y7a fails on 16GB RAM Mac, could be rewritten to use cut memory cca by 1/2) -> should be OK as is
- For NMR structure we could show RMSF instead of B-factor, which can be any anything (1jv8: 0.0, 1wpd: 1.0, 1wrf: values 0-2) -> do not show anything (same for EM...)
- Show water interacting with ligands? -> show the water
- Captions for non-generated images (validation, 2D ligands) -> skip
- Metadata JSONs -> skip (HTTP available: *_filelist, *_json, *_modres.json, *_entity.json (missing since ~2019); 
  HTTP not available: *.json, *_macromolecule.json, *_domains.json, *_missing_images.txt)
- Showing domain on large entries (3j3q, 7y5e) -> use normal quality cartoon (customized with allowing lower)
  - See notes for how much slower it is
- Transparent bg
- Testing - is it enough to check it creates all images on a few entries? -> no, unit testing
- Alternative locations -> OK to show both? (sugar in 5elb) -> keep
- Color highlighted entities/modres in various colors, like with domains (might improve orientation in the data) -> color entities but ensure they have the same colors as in by-entity coloring
- Coarse conformations? - ask David -> some extension to CIF (https://pdb-dev.wwpdb.org/view3d.html?PDBDEV_00000012) -> ask Sameer -> Nope
- Preeti - why CATH domain identifier is Topology not Homology? -> probably should be Homology, create a ticket, refer to 1n26, 1og0 -> it's OK, do not change
- Missing modres in API -> will require image rerun when API fixed
- Render at 1600x1600 (consider modern display sizes: Mac builtin Retina 14-inch (3024 × 1964), Dell external 27-inch (1920 × 1080); 800x800 looks blurry when ~2/3 of display height) (rendering time vs 800x800: ~2x, filesize: ~3-4x) -> render 1600 and 200


## Old process WTFs

- domain.json file
  - CIFend is 1 residue less than in CATH
  - non-modeled residues are excised (this is OK) - ask Mandar if important
- 1hda - old process says: 3 copies of CATH domain in subunit alpha + 4 copies in subunit beta - that's ridiculous
- <https://www.ebi.ac.uk/pdbe/entry/pdb/5cim/biology> - missing CATH images, "0 copies of ..."


## General WTFs about PDBe

- Search 1oex -> the search result says Modified residues: LOV, BOC, SUI; when you go to the entry page, it only shows SUI
  - 8hvp - similar (ABA shown, LOV omitted)
  - 2ve6 - PRQ omitted
  - 1hcj - OK, both are shown (GYS, ABA)
  - They are missing also in PDBe API
  - Missing residues are in short (peptide) chains in 1oex and 8hvp
  -> follow API, it must be addressed there
- <https://www.ebi.ac.uk/pdbe/entry/pdb/8hvp/modified/ABA> - Mol* shows nothing (maybe this is the case for all modres pages?) - reported to Mandar
- PDBe API Observed ranges for 5cim - just bollocks
- The picture gallery sometimes opens in a modal, but sometimes as a page on its own - reported to Mandar, not important
- why is 1l7c pref. assembly 1, when assembly 4 has higher confidence?



## Notes:

- For-each logic in state generating: 
  - foreach entity 
  - foreach ligand 
  - foreach modres 
  - foreach assembly
  - foreach chain foreach domain (nested) 

- Orientation in molrender - just uses PCA and flips to get first residue to first quandrant
- What is the *_entity.json file? -> mapping {entityId: assembly on which it is shown}
- Validation in Mol*:
  - "Structure Quality Report" https://www.ebi.ac.uk/pdbe/api/validation/residuewise_outlier_summary/entry//1bvy
  - "Geometry Quality" https://ftp.rcsb.org/pub/pdb/validation_reports/bv/1bvy/1bvy_validation.xml.gz
  - "Density Fit" https://ftp.rcsb.org/pub/pdb/validation_reports/bv/1bvy/1bvy_validation.xml.gz
- 1tqn b-factors: range 20-89
- RMSF factor - used in Mol* instead of B-factor for coarse conformations
- logging: log to stderr (said Stephen), JS libraries: Bunyan, Winston? (https://geekflare.com/node-js-logger-libraries/)
https://gitlab.ebi.ac.uk/pdbe/release/apps/images
https://gitlab.ebi.ac.uk/pdbe/release/configs/-/blob/master/release/orc.yaml
https://gitlab.ebi.ac.uk/pdbe/release/orc/-/blob/master/orc/images/images.py


3j3q rendering time vs repr quality:
- lowest: 20.629s (this is what 'auto' chooses)
- lower: 29.023s
- low: 41.786s
- medium: 2:16.851
- customized (with allowing lowest): 19s
- customized (with allowing lower): 29s

7y5e rendering time vs repr quality:
- lowest: 6:53.884
- customized (with allowing lowest): 10:29.022
- customized (with allowing lower):: 20:20:00



## ProtVista replacement project:

- Marcelo's PoC - Pixie.js
- PluralSight courses - canvas-based courses?


## Interesting entries

- 1jdk - lactam analog, named as "Acetyl group", LOL



- Mol* - domain coloring - we can use overpaint technique instead of defining components (to avoid artifacts (if we encounter any))


view-state prototype -> cowork with Sebastian

## Suggestions - Mol*:

- more prominent scrollbar in Mol* UI (Deepti)
- Mol* - parsing `_entity.pdbx_description` as list field results into ligand names like "1, 2-ETHANEDIOL" (correct is without space after comma)
- Mol* - axes don't get rendered when I save image in GUI (with Axes: On)
- Mol* - Color theme > Generate distinct > set any param to a zero-width interval (e.g. Hue: 360-360) > Page unresponsive (probably infinite loop with zero increment in src/mol-util/color/distinct.ts:getSamples)
  - The color generation is not perfect anyway (if Chroma and Lum are narrow, but Hue is wide, generates very similar colors)
- `import { ModelSymmetry } from 'molstar/lib/commonjs/mol-model-formats/structure/property/symmetry';` fails to be imported unless e.g. `import { PluginContext } from 'molstar/lib/commonjs/mol-plugin/context';` is imported first (using CommonJS)


## Notes from Google meeting

ProtVista replacement:
- https://www.uniprot.org/uniprotkb/P05067/feature-viewer
- SwissGL
- Pixie.js
- geo-indexing? 

PAE: 
- sending images vs numeric values, bottleneck on data storage
- webp lossless, web assembly, jxl

