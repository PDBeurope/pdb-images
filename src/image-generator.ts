/**
 * Copyright (c) 2023 EMBL - European Bioinformatics Institute, licensed under Apache 2.0, see LICENSE file for more info.
 *
 * @author Adam Midlik <midlik@gmail.com>
 */

import { Mat3 } from 'molstar/lib/commonjs/mol-math/linear-algebra';
import { ModelSymmetry } from 'molstar/lib/commonjs/mol-model-formats/structure/property/symmetry';
import { Model } from 'molstar/lib/commonjs/mol-model/structure';
import { ROTATION_MATRICES, structureLayingTransform } from 'molstar/lib/commonjs/mol-plugin-state/manager/focus-camera/orient-axes';
import { PluginContext } from 'molstar/lib/commonjs/mol-plugin/context';
import { Color } from 'molstar/lib/commonjs/mol-util/color';

import { PDBeAPI } from './api';
import { ImageType, ImageTypes } from './args';
import { Captions, ImageSpec } from './captions/captions';
import { adjustCamera, changeCameraRotation, combineRotations, zoomAll } from './helpers/camera';
import { ANNOTATION_COLORS, ENTITY_COLORS, MODRES_COLORS, assignEntityAndUnitColors, cycleIterator, lightnessVariant } from './helpers/colors';
import { getModifiedResidueInfo } from './helpers/helpers';
import { getLogger, oneLine } from './helpers/logging';
import { countDomains, selectBestChainForDomains, sortDomainsByChain, sortDomainsByEntity } from './helpers/sifts';
import { countChainResidues, getChainInfo, getEntityInfo, getLigandInfo } from './helpers/structure-info';
import { SubstructureDef } from './helpers/substructure-def';
import { ModelNode, RootNode, StructureNode, TrajectoryNode, VisualNode, using } from './tree-manipulation';


const logger = getLogger(module);

const ALLOW_GHOST_NODES = true; // just for debugging, should be `true` in production
const ALLOW_COLLAPSED_NODES = true; // just for debugging, should be `true` in production


/** Options for modifying visualization style */
export interface ImageGeneratorOptions {
    /** Set `true` to show hydrogen atoms in ball-and-stick visuals, `false` to always ignore them. */
    showHydrogens?: boolean,
    /** Set `true` to show semi-transparent ball-and-stick visuals for branched entities (i.e. carbohydrates) in addition to the default 3D-SNFG visuals. */
    showBranchedSticks?: boolean,
    /** Set `true` to show individual models within an ensemble in different shades of the base color (lighter and darker). */
    ensembleShades?: boolean,
    /** Set `true` to allow any quality level for visuals (including 'lowest', which is really ugly). Set `false` to allow only 'lower' and better. */
    allowLowestQuality?: boolean,
}

/** Class for generating all possible images of an entry */
export class ImageGenerator {
    /** Rotation matrix to use for currently created scenes */
    private rotation: Mat3 = Mat3.identity();
    /** Set of requested image types */
    public readonly imageTypes: Set<ImageType>;
    /** List of entities that were not found in the preferred assembly and should be retried in other assemblies */
    private failedEntities: string[] = [];

    constructor(
        /** The plugin to perform all operations in */
        public readonly plugin: PluginContext,
        /** Function that takes ImageSpec object and performs anything necessary to save the current plugin state (e.g. render image, save files...) */
        public readonly saveFunction: (spec: ImageSpec) => any,
        /** API client for retrieving additional data */
        public readonly api: PDBeAPI,
        /** List of requested image types */
        imageTypes: ImageType[] = ['all'],
        /** 'front' is to render only front view; 'all' is to render front, side, and top view; 'auto' is to render all three views only for certain image types */
        public views: 'front' | 'all' | 'auto' = 'auto',
        public options: ImageGeneratorOptions = {},
    ) {
        if (imageTypes.includes('all')) {
            this.imageTypes = new Set(ImageTypes);
        } else {
            this.imageTypes = new Set(imageTypes);
        }
    }

    /** Return `true` if any of `imageTypes` is requested to be rendered. */
    private shouldRender(...imageTypes: ImageType[]) {
        return imageTypes.some(t => this.imageTypes.has(t));
    }

    /** Create all requested images for an entry */
    async processAll(entryId: string, inputUrl: string, mode: 'pdb' | 'alphafold') {
        logger.info('Processing', entryId, 'from', inputUrl);
        const isBinary = inputUrl.endsWith('.bcif');
        logger.debug('Assuming input is', isBinary ? 'binary CIF' : 'mmCIF');

        const startTime = Date.now();
        let success = false;
        try {
            const root = RootNode.create(this.plugin);
            await using(root.makeDownload({ url: inputUrl, isBinary }, entryId), async download => {
                const cif = await download.makeCif();
                const traj = await cif.makeTrajectory();
                await using(traj.makeModel(0), async rawModel => {
                    const model = await rawModel.makeCustomModelProperties(this.api);

                    // Images from assembly structures
                    if (mode === 'pdb' && this.shouldRender('assembly', 'entity', 'modres')) {
                        let assemblies = ModelSymmetry.Provider.get(model.data!)?.assemblies ?? [];
                        let preferredAssemblyId = await this.api.getPreferredAssemblyId(entryId);
                        logger.debug(`Assemblies (${assemblies.length}):`);
                        for (const ass of assemblies) logger.debug('   ', oneLine(ass));
                        logger.debug('Preferred assembly:', preferredAssemblyId);
                        if (assemblies.length === 0) logger.error('There are no assemblies');
                        if (preferredAssemblyId === undefined) {
                            preferredAssemblyId = assemblies[0]?.id;
                            if (!this.api.offline) logger.warn(`API says preferred assembly is undefined, using the first assembly (${preferredAssemblyId}) as preferred`);
                        } else {
                            assemblies = [
                                ...assemblies.filter(ass => ass.id === preferredAssemblyId),
                                ...assemblies.filter(ass => ass.id !== preferredAssemblyId),
                            ];
                        };
                        for (const assembly of assemblies) {
                            const isPreferredAssembly = assembly.id === preferredAssemblyId;
                            await this.processAssemblyStructure(entryId, model, assembly.id, isPreferredAssembly);
                        }
                    }

                    // Images from deposited model structure
                    if (this.shouldRender('entry', 'validation', 'bfactor', 'ligand', 'domain', 'plddt') || this.failedEntities.length > 0) {
                        await this.processDepositedStructure(mode, entryId, model, traj);
                    }

                    if (this.failedEntities.length > 0) {
                        logger.error(`Failed to create images for these entities: ${this.failedEntities}`);
                        this.failedEntities = [];
                    }
                });
            });
            success = true;
        } finally {
            const seconds = (Date.now() - startTime) / 1000;
            logger.info('Processed', entryId, 'in', seconds, 'seconds', success ? '' : '(failed)');
        }
    }

    /** Create requested images which are generated from the deposited model */
    private async processDepositedStructure(mode: 'pdb' | 'alphafold', entryId: string, model: ModelNode, traj: TrajectoryNode) {
        logger.info('Processing deposited structure');
        await using(model.makeStructure({ type: { name: 'model', params: {} } }), async structure => {
            const group = await structure.makeGroup({ label: 'Whole Entry' }, { state: { isGhost: ALLOW_GHOST_NODES } });
            const components = await group.makeStandardComponents(ALLOW_COLLAPSED_NODES);
            const visuals = await components.makeStandardVisuals(this.options);
            this.orientAndZoomAll(structure);
            const nModels = traj.data?.frameCount ?? 1;
            logger.info('Number of models:', nModels);
            const context = {
                entryId, assemblyId: undefined, isPreferredAssembly: false, nModels,
                entityNames: await this.api.getEntityNames(entryId),
                entityInfo: getEntityInfo(structure.data!)
            };
            const colors = assignEntityAndUnitColors(structure.data!);

            if (mode === 'pdb') {
                if (this.shouldRender('entry')) {
                    if (nModels === 1) {
                        await visuals.applyToAll(vis => vis.setColorByChainInstance({ colorList: colors.units }));
                        await this.saveViews('all', view => Captions.forEntryOrAssembly({ ...context, coloring: 'chains', view }));

                        await visuals.applyToAll(vis => vis.setColorByEntity({ colorList: colors.entities }));
                        await this.saveViews('all', view => Captions.forEntryOrAssembly({ ...context, coloring: 'entities', view }));
                    } else {
                        model.setCollapsed(ALLOW_COLLAPSED_NODES);
                        const visualsByModel = [visuals];
                        await using(traj.makeGroup({ label: 'Other models' }, { state: { isGhost: ALLOW_GHOST_NODES } }), async group => {
                            const allVisuals: (VisualNode | undefined)[] = Object.values(visuals.nodes);
                            for (let iModel = 1; iModel < nModels; iModel++) {
                                const otherModel = await group.makeModel(iModel);
                                const otherStructure = await otherModel.makeStructure({ type: { name: 'model', params: {} } });
                                const otherComponents = await otherStructure.makeStandardComponents(ALLOW_COLLAPSED_NODES);
                                const otherVisuals = await otherComponents.makeStandardVisuals(this.options);
                                otherModel.setCollapsed(ALLOW_COLLAPSED_NODES);
                                allVisuals.push(...Object.values(otherVisuals.nodes));
                                visualsByModel.push(otherVisuals);
                            }
                            this.zoomAll(); // zoom whole ensemble (needed e.g. for 3gaw)
                            for (let i = 0; i < visualsByModel.length; i++) {
                                const unitColors = this.options.ensembleShades ? lightnessVariant(colors.units, i) : colors.units;
                                await visualsByModel[i].applyToAll(vis => vis.setColorByChainInstance({ colorList: unitColors }));
                            }
                            await this.saveViews('all', view => Captions.forEntryOrAssembly({ ...context, coloring: 'chains', view }));

                            for (let i = 0; i < visualsByModel.length; i++) {
                                const entityColors = this.options.ensembleShades ? lightnessVariant(colors.entities, i) : colors.entities;
                                await visualsByModel[i].applyToAll(vis => vis.setColorByEntity({ colorList: entityColors }));
                            }
                            await this.saveViews('all', view => Captions.forEntryOrAssembly({ ...context, coloring: 'entities', view }));
                        });
                        this.zoomAll(); // zoom back to model 1
                        model.setCollapsed(false);
                    }
                }

                if (this.shouldRender('validation')) {
                    await visuals.applyToAll(vis => vis.setColorByGeometryValidation());
                    await this.saveViews('front', view => Captions.forGeometryValidation({ entryId, view }));
                }
                if (this.shouldRender('bfactor')) {
                    if (model.data && Model.isFromXray(model.data)) {
                        await visuals.nodes.polymerCartoon?.setPutty();
                        await visuals.applyToAll(vis => vis.setColorByBfactor('rainbow'));
                        await this.saveViews('front', view => Captions.forBFactor({ entryId, view }));
                        await visuals.nodes.polymerCartoon?.setCartoon();
                    } else {
                        logger.info('Skipping B-factor images because the structure is not from diffraction.');
                    }
                }

                await visuals.applyToAll(vis => vis.setFaded('size-dependent'));

                if (this.failedEntities.length > 0) {
                    logger.info(`Retrying previously failed entities: ${this.failedEntities}`);
                    const summary = await this.processEntities(structure, context, colors.entities, this.failedEntities);
                    this.failedEntities = summary.failedEntities;
                }

                group.setGhost(false);
                group.setCollapsed(ALLOW_COLLAPSED_NODES);
                group.setVisible(false);

                if (this.shouldRender('ligand')) {
                    await this.processLigands(structure, context, colors.entities);
                }
                if (this.shouldRender('domain')) {
                    await this.processDomains(structure, context);
                }
            }

            if (mode === 'alphafold' && this.shouldRender('plddt')) {
                await visuals.applyToAll(vis => vis.setColorByPlddt());
                await this.saveViews('all', view => Captions.forPlddt({ afdbId: entryId, view }));
            }
        });
    }

    /** Create requested images that are generated from each assembly structure.
     * If `isPreferredAssembly`, also create images that are generated from the preferred assembly. */
    private async processAssemblyStructure(entryId: string, model: ModelNode, assemblyId: string, isPreferredAssembly: boolean) {
        logger.info(`Processing assembly ${assemblyId}`, isPreferredAssembly ? '(preferred)' : '(non-preferred)');
        await using(model.makeStructure({ type: { name: 'assembly', params: { id: assemblyId } } }), async structure => {
            const context = {
                entryId, assemblyId, isPreferredAssembly, nModels: 1,
                entityNames: await this.api.getEntityNames(entryId),
                entityInfo: getEntityInfo(structure.data!)
            };
            const colors = assignEntityAndUnitColors(structure.data!);
            const group = await structure.makeGroup({ label: 'Whole Assembly' }, { state: { isGhost: ALLOW_GHOST_NODES } });
            const components = await group.makeStandardComponents(ALLOW_COLLAPSED_NODES);
            const visuals = await components.makeStandardVisuals(this.options);
            this.orientAndZoomAll(structure);
            if (this.shouldRender('assembly')) {
                await visuals.applyToAll(vis => vis.setColorByChainInstance({ colorList: colors.units }));
                await this.saveViews('all', view => Captions.forEntryOrAssembly({ ...context, coloring: 'chains', view }));

                await visuals.applyToAll(vis => vis.setColorByEntity({ colorList: colors.entities }));
                await this.saveViews('all', view => Captions.forEntryOrAssembly({ ...context, coloring: 'entities', view }));
            }

            if (isPreferredAssembly && this.shouldRender('entity') || this.failedEntities.length > 0) {
                if (this.failedEntities.length > 0) logger.info(`Retrying previously failed entities: ${this.failedEntities}`);
                const todoEntities = isPreferredAssembly ? undefined : this.failedEntities; // undefined means all
                await visuals.applyToAll(vis => vis.setFaded('size-dependent'));
                const summary = await this.processEntities(structure, context, colors.entities, todoEntities);
                this.failedEntities = summary.failedEntities;
            }
            if (isPreferredAssembly && this.shouldRender('modres')) {
                await visuals.applyToAll(vis => vis.setFaded('size-dependent'));
                await this.processModifiedResidues(structure, context);
            }
        });
    }

    /** Create images for entities listed in `todoEntities`.
     * Process all entities if `todoEntities===undefined`. */
    private async processEntities(structure: StructureNode, context: Captions.StructureContext, colors: Color[] = ENTITY_COLORS, todoEntities?: string[]) {
        const { assemblyId, entityInfo } = context;
        logger.debug(`Entities (${Object.keys(entityInfo).length}):`);
        for (const entityId in entityInfo) logger.debug(`    Entity ${entityId} ${oneLine(entityInfo[entityId])}`);
        const summary = { successfulEntities: [] as string[], failedEntities: [] as string[], skippedEntities: [] as string[] };
        await using(structure.makeGroup({ label: 'Entities' }), async group => {
            // here it crashes on 7y7a (16GB RAM Mac), FATAL ERROR: Ineffective mark-compacts near heap limit Allocation failed - JavaScript heap out of memory
            const entityStructs = await group.makeEntities(entityInfo);
            for (const [entityId, entityStruct] of Object.entries(entityStructs)) {
                if (!entityStruct) continue;
                const entityColor = colors[entityInfo[entityId].index % colors.length];
                const components = await entityStruct.makeStandardComponents(ALLOW_COLLAPSED_NODES);
                const visuals = await components.makeStandardVisuals(this.options);
                await visuals.applyToAll(vis => vis.setHighlight(entityColor));
                entityStruct.setVisible(false);
                entityStruct.setCollapsed(ALLOW_COLLAPSED_NODES);
            }
            for (const entityId of todoEntities ?? Object.keys(entityStructs)) {
                const entityStruct = entityStructs[entityId];
                if (!entityStruct) {
                    const assembly = assemblyId ? `assembly ${assemblyId}` : 'the deposited structure';
                    logger.warn(`Skipping images for entity ${entityId} (not present in ${assembly})`);
                    summary.failedEntities.push(entityId);
                    continue;
                }
                if (entityInfo[entityId].type === 'water') {
                    logger.info(`Skipping images for entity ${entityId} (water entity)`);
                    summary.skippedEntities.push(entityId);
                    continue;
                }
                entityStruct.setVisible(true);
                await this.saveViews('all', view => Captions.forHighlightedEntity({ ...context, entityId, view }));
                entityStruct.setVisible(false);
                summary.successfulEntities.push(entityId);
            }
        });
        return summary;
    }

    /** Create images for ligands */
    private async processLigands(structure: StructureNode, context: Captions.StructureContext, entityColors?: Color[]) {
        const structData = structure.data!;
        const ligandInfo = getLigandInfo(structData);
        logger.debug(`Ligands (${Object.keys(ligandInfo).length}):`);
        for (const lig in ligandInfo) logger.debug('   ', lig, oneLine(ligandInfo[lig]));
        for (const info of Object.values(ligandInfo)) {
            await using(structure.makeLigEnvComponents(info, ALLOW_COLLAPSED_NODES), async components => {
                const visuals = await components.makeLigEnvVisuals({ ...this.options, entityColors });
                this.orientAndZoomAll(components.nodes.ligand!);
                await this.saveViews('front', view => Captions.forLigandEnvironment({ ...context, view, ligandInfo: info }));
            });
        }
    }

    /** Create images for SIFTS domains */
    private async processDomains(structure: StructureNode, context: Captions.StructureContext) {
        const domains = await this.api.getSiftsMappings(context.entryId);
        const chainInfo = getChainInfo(structure.data!.model);
        const chainLengths = countChainResidues(structure.data!.model);
        logger.debug('Chain lengths:', oneLine(chainLengths));

        const allDomains = sortDomainsByEntity(domains);
        const selectedDomains = selectBestChainForDomains(allDomains, chainLengths);
        const selectedDomainsByChain = sortDomainsByChain(selectedDomains);
        const allDomainCounts = countDomains(allDomains);
        const selectedDomainCounts = countDomains(selectedDomains);

        logger.debug('Domains:');
        for (const [source, sourceDoms] of Object.entries(allDomains)) {
            logger.debug(`    ${source}:`);
            for (const [family, familyDoms] of Object.entries(sourceDoms)) {
                logger.debug(`        ${family}:`);
                for (const [entityId, entityDoms] of Object.entries(familyDoms)) {
                    logger.debug(`            Entity ${entityId}:`);
                    for (const dom of entityDoms) {
                        logger.debug(`                ${oneLine(dom)}:`);
                    }
                }
            }
        }

        const colorsIterator = cycleIterator(ANNOTATION_COLORS);
        for (const [chainId, chainDomains] of Object.entries(selectedDomainsByChain)) {
            const authChainId = chainInfo[chainId].authChainId;
            await using(structure.makeAuthChain(authChainId, chainId), async chain => { // selecting by authChainId to include ligands
                if (!chain) return;
                const entityId = chainInfo[chainId].entityId;
                const components = await chain.makeStandardComponents(ALLOW_COLLAPSED_NODES);
                const visuals = await components.makeStandardVisuals(this.options);
                chain.setCollapsed(ALLOW_COLLAPSED_NODES);
                this.orientAndZoomAll(chain);
                await visuals.applyToAll(vis => vis.setFaded('normal'));

                for (const [source, sourceDomains] of Object.entries(chainDomains)) {
                    for (const [familyId, familyDomains] of Object.entries(sourceDomains)) {
                        const domDefs: { [id: string]: SubstructureDef } = {};
                        for (const dom of familyDomains) {
                            const label = `Domain ${dom.id} (${source} ${familyId})`;
                            const ranges = dom.chunks.map(c => [c.startResidue, c.endResidue] as [number, number]);
                            domDefs[dom.id] = SubstructureDef.Domain.create(chainId, ranges, label);
                        }
                        const familyName = familyDomains[0].familyName;
                        const totalCopies = allDomainCounts[source][familyId][entityId];
                        const shownCopies = selectedDomainCounts[source][familyId][entityId];
                        await using(structure.makeGroup({ label: 'Domains' }, { state: { isGhost: ALLOW_GHOST_NODES } }), async group => {
                            const domainStructures = await group.makeSubstructures(domDefs, ALLOW_COLLAPSED_NODES);
                            const outOfRangeCopies = shownCopies - Object.keys(domainStructures).length; // this will be >0 when a domain is out of observed residue ranges (e.g. 8eiu chain KA [auth h] Pfam PF03948)
                            for (const domainStruct of Object.values(domainStructures)) {
                                const components = await domainStruct.makeStandardComponents(ALLOW_COLLAPSED_NODES);
                                const visuals = await components.makeStandardVisuals(this.options);
                                const color = colorsIterator.next().value!; // same color for all visuals of the domain
                                await visuals.applyToAll(vis => vis.setColorUniform(color, { ignoreElementColors: true }));
                            }
                            await this.saveViews('front', view => Captions.forDomain({ ...context, source, familyId, familyName, entityId, chainId, authChainId, totalCopies, shownCopies, outOfRangeCopies, view }));
                        });
                    };
                };
            });
        };
    }

    /** Create images for modified residues */
    private async processModifiedResidues(structure: StructureNode, context: Captions.StructureContext) {
        const modifiedResidues = await this.api.getModifiedResidue(context.entryId);
        const modresInfo = getModifiedResidueInfo(modifiedResidues);
        logger.debug(`Modified residues (${Object.keys(modresInfo).length}):`);
        for (const modres in modresInfo) logger.debug('   ', modres, oneLine(modresInfo[modres]));

        if (Object.keys(modresInfo).length === 0) return;

        const setDefinitions: { [modres: string]: SubstructureDef } = {};
        for (const modres in modresInfo) setDefinitions[modres] = modresInfo[modres].instances;

        const unprocessedModres = new Set(Object.keys(modresInfo));
        const colorsIterator = cycleIterator(MODRES_COLORS);
        await using(structure.makeGroup({ label: 'Modified Residues' }), async group => {
            const modresStructures = await group.makeSubstructures(setDefinitions);
            for (const struct of Object.values(modresStructures)) {
                const visual = await struct.makeBallsAndSticks(this.options, ['modresSticks']);
                await visual.setHighlight(colorsIterator.next().value!);
                struct.setCollapsed(ALLOW_COLLAPSED_NODES);
                struct.setVisible(false);
            }
            for (const [modres, struct] of Object.entries(modresStructures)) {
                const nInstances = struct.data!.atomicResidueCount; // Using number of instances in the assembly, not in the deposited model
                struct.setVisible(true);
                await this.saveViews('all', view => Captions.forModifiedResidue({ ...context, modresInfo: { ...modresInfo[modres], nInstances }, view }));
                struct.setVisible(false);
                unprocessedModres.delete(modres);
            };
            if (unprocessedModres.size > 0) logger.error(`Failed to create images for these modified residues: ${Array.from(unprocessedModres).sort()}`);
        });
    }

    /** Zoom whole visible scene, without changing camera rotation. */
    private zoomAll() {
        zoomAll(this.plugin);
    }

    /** Set rotation matrix to align PCA axes of `structure` with screen axes and zoom whole visible scene. */
    private orientAndZoomAll(structure: StructureNode, referenceRotation?: Mat3) {
        this.rotation = structureLayingTransform([structure.data!], referenceRotation).rotation;
        this.zoomAll();
    }

    /** Run saveFunction on the current state.
     * Will run saveFunction either once (front view) or three times (front, side, top view) depending on `this.view`.
     * The `view` parameter has effect only when `this.view` is `'auto'`.
     */
    private async saveViews(views: 'front' | 'all', spec: (view: 'front' | 'side' | 'top' | undefined) => ImageSpec) {
        if (this.views === 'all' || (this.views === 'auto' && views === 'all')) {
            adjustCamera(this.plugin, s => changeCameraRotation(s, this.rotation));
            await this.saveFunction(spec('front'));

            const rotationSide = combineRotations(this.rotation, ROTATION_MATRICES.rotY270);
            adjustCamera(this.plugin, s => changeCameraRotation(s, rotationSide));
            await this.saveFunction(spec('side'));

            const rotationTop = combineRotations(this.rotation, ROTATION_MATRICES.rotX90);
            adjustCamera(this.plugin, s => changeCameraRotation(s, rotationTop));
            await this.saveFunction(spec('top'));
        } else {
            adjustCamera(this.plugin, s => changeCameraRotation(s, this.rotation));
            await this.saveFunction(spec(undefined));
        }
    }
}
