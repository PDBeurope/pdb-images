# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
