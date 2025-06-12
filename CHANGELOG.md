# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

- Treat ligands like H2S, NH3 as single-element for coloring purposes
- Default structure source in Alphafold mode is BCIF
- Updated Molstar version to 4.18.0

## [2.5.0] - 2024-08-20

- Updated Molstar version to 4.5.0

## [2.4.0] - 2024-01-10

- Fixed zoom issues (too much zoom when using PDBImages <2.4 with MolStar >=3.43.0)

## [2.3.2] - 2024-01-02

- Added citing information to README

## [2.3.1] - 2023-10-20

- Fixed typing for older TypeScript versions
- Updated GitHub actions to use docker/login-action@v3, docker/build-push-action@v5

## [2.3.0] - 2023-10-20

- Added `pdb2cif` utility script

## [2.2.0] - 2023-08-08

- Show ball-and-stick visual for amino acids linking carbohydrate to protein
- Added `createArgs` function for calling `main` more easily

## [2.1.1] - 2023-07-26

- Fixed bug in checking expected files (do not check if empty when missing)
- Do not fail when PDBe Structure Validation Report is not available, show gray structure instead (e.g. 6u6h)
- Do not fail when modified residue is not modelled, show structure without anything highlighted instead (e.g. 1aco)
- Do not fail when ligand is not modelled, show structure without anything highlighted instead (e.g. 2icy)
- Print warning when assemblies from API don't reflect mmCIF and use the first assembly as fallback for preferred assembly (e.g. 2zuf)

## [2.1.0] - 2023-07-20

- Image sizes are automatically sorted from the largest to the smallest (so that the largest one is rendered)
- Fixed assembly captions, fixed homo/hetero n-mer names in captions (e.g. 8a5v)
- Ensembles - zoom on all models
- Fixed colors so that color of mono-element entity (e.g. Na, Mg) equals color of the element
- Fixed coloring by chain for ball-and-stick visuals
- Sister colors (used for chains of the same entity) - first use lighter
- Added ball-and-stick visual for non-standard residues
- Opacity in entity images is dependent on structure size
- Save _api_data.json
- Create _expected_files.txt and check for missing files after run
- Hide hydrogens and branched entity balls-and-sticks by default
- New args --show-hydrogens --show-branched-sticks --ensemble-shades --allow-lowest-quality

## [2.0.0] - 2023-07-19

- Renamed this package to `pdb-images`

## [1.0.0] - 2023-06-20

- First official release
