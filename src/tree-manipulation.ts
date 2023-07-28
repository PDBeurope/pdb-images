/**
 * Copyright (c) 2023 EMBL - European Bioinformatics Institute, licensed under Apache 2.0, see LICENSE file for more info.
 *
 * @author Adam Midlik <midlik@gmail.com>
 */

import { Structure } from 'molstar/lib/commonjs/mol-model/structure';
import { BondType } from 'molstar/lib/commonjs/mol-model/structure/model/types';
import { RootStructureDefinition } from 'molstar/lib/commonjs/mol-plugin-state/helpers/root-structure';
import { StructureComponentParams } from 'molstar/lib/commonjs/mol-plugin-state/helpers/structure-component';
import { PluginStateObject } from 'molstar/lib/commonjs/mol-plugin-state/objects';
import { Download, ParseCif } from 'molstar/lib/commonjs/mol-plugin-state/transforms/data';
import { CreateGroup } from 'molstar/lib/commonjs/mol-plugin-state/transforms/misc';
import { CustomModelProperties, ModelFromTrajectory, StructureComponent, StructureFromModel, TrajectoryFromMmCif } from 'molstar/lib/commonjs/mol-plugin-state/transforms/model';
import { StructureRepresentation3D } from 'molstar/lib/commonjs/mol-plugin-state/transforms/representation';
import { setSubtreeVisibility } from 'molstar/lib/commonjs/mol-plugin/behavior/static/state';
import { PluginContext } from 'molstar/lib/commonjs/mol-plugin/context';
import { getStructureQuality } from 'molstar/lib/commonjs/mol-repr/util';
import { MolScriptBuilder } from 'molstar/lib/commonjs/mol-script/language/builder';
import { State, StateObject, StateObjectSelector, StateTransform } from 'molstar/lib/commonjs/mol-state';
import { Color } from 'molstar/lib/commonjs/mol-util/color';
import { ColorLists } from 'molstar/lib/commonjs/mol-util/color/lists';
import { ParamDefinition } from 'molstar/lib/commonjs/mol-util/param-definition';

import { PDBeAPI } from './api';
import { DEFAULT_COLORS, ENTITY_COLORS } from './helpers/colors';
import { PPartial, chainLabel, deepMerge, toKebabCase } from './helpers/helpers';
import { oneLine } from './helpers/logging';
import { EntityInfo, LigandInfo, getEntityInfo } from './helpers/structure-info';
import { SubstructureDef } from './helpers/substructure-def';


/** Radius around a ligand to consider as "environment" and show as ball-and-stick in ligand images; in Angstroms, applied by-residue */
const LIGAND_ENVIRONMENT_RADIUS = 5;
/** Number of connected residues to add to ligand environment to create "wider environment" and show as cartoon in ligand images */
const LIGAND_WIDE_ENVIRONMENT_LAYERS = 2;
/** Opacity for ball-and-stick visual of carbohydrates */
const BRANCHED_STICKS_OPACITY = 0.3;

const DEFAULT_HIGHLIGHT_COLOR = Color.fromRgb(40, 100, 255);
const FADED_COLOR = Color.fromRgb(120, 120, 120);
const FADED_SIZE_SCALE = 0.9;
const EXTRA_FADED_SIZE_SCALE = 0.4;
/** Level of opacity used for domain and ligand images */
const FADED_OPACITY = 0.5;
/** Parameter for structure-size-dependent opacity, used for entity images */
const SMART_FADED_OPACITY_PARAMS = {
    targetOpacity: 0.9, // ~ desired opacity of the structure as a whole
    baseOpacity: 0.05, // minimum opacity (for infinitely large structure)
    n0: 100, // artificial offset of residue count
}; // This will result in opacity ~0.4 for tiny structures, ~0.05 for huge structures

const STICK_SIZE_FACTOR = 0.25;
const HIGHTLIGHT_STICK_SIZE_FACTOR = 0.75;
/** For ligand environments */
const ENVIRONMENT_STICK_SIZE_FACTOR = 0.11;
const STICK_SIZE_ASPECT_RATIO = 0.5;

/** To be used when PDBe Structure Quality report is not available. */
const VALIDATION_UNAVAILABLE_COLOR = FADED_COLOR;


export type StructureObjSelector = StateObjectSelector<PluginStateObject.Molecule.Structure, any>

type StandardComponentType = 'polymer' | 'branched' | 'ligand' | 'ion' | 'nonstandard'
type LigEnvComponentType = 'ligand' | 'environment' | 'wideEnvironment' | 'linkage'
type StandardVisualType = 'polymerCartoon' | 'branchedCarbohydrate' | 'branchedSticks' | 'ligandSticks' | 'ionSticks' | 'nonstandardSticks'
type LigEnvVisualType = 'ligandSticks' | 'environmentSticks' | 'linkageSticks' | 'wideEnvironmentCartoon'

type StructureParams = ParamDefinition.Values<ReturnType<typeof RootStructureDefinition.getParams>>
type VisualParams = ReturnType<typeof StructureRepresentation3D.createDefaultParams>


/** Handle for manipulating state tree node */
abstract class Node<S extends StateObject = StateObject> {
    /** State tree node, or its nearest non-group ancestor */
    readonly origin: StateObjectSelector<S, any>;
    /** State tree node (can be a "Group" node) */
    readonly node: StateObjectSelector<S, any> | StateObjectSelector<PluginStateObject.Group, any>;

    protected constructor(origin: StateObjectSelector<S, any>, group?: StateObjectSelector<PluginStateObject.Group, any>) {
        this.origin = origin;
        this.node = group ?? origin;
    }
    /** Create a new instance of the same subclass as this */
    private createAnother(origin: StateObjectSelector<S, any>, group?: StateObjectSelector<PluginStateObject.Group, any>): this {
        return Object.create(Object.getPrototypeOf(this)).constructor(origin, group);
    }
    /** Return plugin state */
    get state(): State {
        const state = this.node.state;
        if (!state) throw new Error('state is undefined');
        return state;
    }
    /** Return data associated with the node (for group nodes automatically get data from a non-group ancestor) */
    get data() { return this.origin.data; }

    /** Create a group node with this node as parent */
    async makeGroup(params?: { label?: string, description?: string }, stateOptions?: Partial<StateTransform.Options>): Promise<this> {
        const refSuffix = params?.label ? toKebabCase(params.label) : 'group';
        const ref = this.childRef(refSuffix);
        const groupNode = await this.state.build().to(this.node).apply(CreateGroup, params, { ref, ...stateOptions }).commit();
        const result = this.createAnother(this.origin, groupNode);
        return result;
    }
    /** Make a node visible, i.e. visuals within its subtree will be visible in 3D */
    setVisible(visible: boolean): void {
        setSubtreeVisibility(this.state, this.node.ref, !visible); // true means hide, ¯\_(ツ)_/¯
    }
    /** Make a node collapsed, i.e. its subtree will be hidden in state tree view */
    setCollapsed(collapsed: boolean): void {
        this.state.updateCellState(this.node.ref, { isCollapsed: collapsed });
    }
    /** Make a node "ghost", i.e. it will not be shown in state tree view */
    setGhost(ghost: boolean): void {
        this.state.updateCellState(this.node.ref, { isGhost: ghost });
    }
    /** Create a ref string for a new node. */
    protected baseRef(idForRef?: string): string | undefined {
        return References.unique(this.state, References.base(idForRef));
    }
    /** Create a ref string for a new node which will be a child of this node. */
    protected childRef(suffix: string, replaceOldSuffix?: boolean): string | undefined {
        return References.unique(this.state, References.child(this.node.ref, suffix, replaceOldSuffix));
    }
    /** Remove this node from the state tree. */
    async dispose(): Promise<void> {
        await this.state.build().delete(this.node).commit();
    }
}


/** Handle for state tree root */
export class RootNode extends Node<PluginStateObject.Root> {
    static create(plugin: PluginContext): RootNode {
        return new RootNode(new StateObjectSelector(plugin.state.data.root.transform.ref, plugin.state.data));
    }
    /** Create a data download node with this root as parent */
    async makeDownload(params: { url: string, isBinary: boolean }, idForRef?: string): Promise<DataNode> {
        const ref = this.baseRef(idForRef);
        const dataNode = await this.state.build().to(this.node).apply(Download, params, { ref }).commit();
        if (!dataNode.data) throw new Error(`Failed to download data from ${params.url}`);
        return new DataNode(dataNode);
    }
}


/** Handle for Data node */
export class DataNode extends Node<PluginStateObject.Data.Binary | PluginStateObject.Data.String> {
    /** Create a CIF node with this node as parent (parse data as CIF) */
    async makeCif(): Promise<CifNode> {
        const ref = this.childRef('cif', true);
        const cifNode = await this.state.build().to(this.node).apply(ParseCif, undefined, { ref }).commit();
        return new CifNode(cifNode);
    }
}


/** Handle for Cif node */
export class CifNode extends Node<PluginStateObject.Format.Cif> {
    /** Create a Trajectory node with this node as parent */
    async makeTrajectory(): Promise<TrajectoryNode> {
        const ref = this.childRef('traj', true);
        const trajNode = await this.state.build().to(this.node).apply(TrajectoryFromMmCif, undefined, { ref }).commit();
        return new TrajectoryNode(trajNode);
    }
}


/** Handle for Trajectory node */
export class TrajectoryNode extends Node<PluginStateObject.Molecule.Trajectory> {
    /** Create a Model node with this node as parent */
    async makeModel(modelIndex: number): Promise<ModelNode> {
        const ref = this.childRef(`model-${modelIndex}`, true);
        const modelNode = await this.state.build().to(this.node).apply(ModelFromTrajectory, { modelIndex }, { ref }).commit();
        return new ModelNode(modelNode);
    }
}


/** Handle for Model node */
export class ModelNode extends Node<PluginStateObject.Molecule.Model> {
    /** Create a CustomModelProperties node with this node as parent */
    async makeCustomModelProperties(api?: PDBeAPI): Promise<ModelNode> {
        const ref = this.childRef('props');
        const customPropsNode = await this.state.build().to(this.node).apply(CustomModelProperties, {
            properties: {
                pdbe_structure_quality_report: {
                    serverUrl: api?.pdbeStructureQualityReportPrefix()
                }
            }
        }, { ref }).commit();
        return new ModelNode(customPropsNode);
    }
    /** Create a Structure node with this node as parent */
    async makeStructure(params: StructureParams): Promise<StructureNode> {
        let refSuffix = `struct-${params.type.name}`;
        if (params.type.name === 'assembly') refSuffix += `-${params.type.params.id}`;
        const ref = this.childRef(refSuffix);
        const structure = await this.state.build().to(this.node).apply(StructureFromModel, params, { ref }).commit();
        if (structure.data && !structure.data.isEmpty) {
            return new StructureNode(structure);
        } else {
            await this.state.build().delete(structure).commit();
            throw new Error(`Failed to create a structure from model node '${this.node.ref}' with params ${oneLine(params)}.`);
        }
    }
}


/** Handle for Structure node */
export class StructureNode extends Node<PluginStateObject.Molecule.Structure> {
    /** Create a substructure node with this node as parent */
    async makeComponent(params: Partial<StructureComponentParams>, options?: Partial<StateTransform.Options>, refSuffix?: string): Promise<StructureNode | undefined> {
        const ref = this.childRef(refSuffix ?? 'comp');
        const component = await this.state.build().to(this.node).apply(StructureComponent, params, { ref, ...options }).commit();
        if (component.data && !component.data.isEmpty) {
            return new StructureNode(component);
        } else {
            await this.state.build().delete(component).commit();
            return undefined;
        }
    }
    /** Create components "polymer", "branched", "ligand", "ion", "nonstandard" for a structure */
    async makeStandardComponents(collapsed: boolean = false): Promise<StandardComponents> {
        const options: Partial<StateTransform.Options> = { state: { isCollapsed: collapsed } };
        const polymer = await this.makeComponent({ type: { name: 'static', params: 'polymer' } }, options, 'polymer');
        const branched = await this.makeComponent({ type: { name: 'static', params: 'branched' } }, options, 'branched');
        const ligand = await this.makeComponent({ type: { name: 'static', params: 'ligand' } }, options, 'ligand');
        const ion = await this.makeComponent({ type: { name: 'static', params: 'ion' } }, options, 'ion');
        const nonstandard = await this.makeComponent({ type: { name: 'static', params: 'non-standard' } }, options, 'nonstandard');
        return new StandardComponents({ polymer, branched, ligand, ion, nonstandard });
    }
    /** Create components "ligand" and "environment" for a ligand */
    async makeLigEnvComponents(ligandInfo: LigandInfo, collapsed: boolean = false): Promise<LigandEnvironmentComponents> {
        const options: Partial<StateTransform.Options> = { state: { isCollapsed: collapsed } };
        const ligandLabel = ligandInfo.compId;
        const envLabel = `Environment (${LIGAND_ENVIRONMENT_RADIUS} Å)`;

        const ligExpr = MolScriptBuilder.struct.generator.atomGroups({
            'chain-test': MolScriptBuilder.core.rel.eq([
                MolScriptBuilder.struct.atomProperty.macromolecular.label_asym_id(),
                ligandInfo.chainId])
        });
        const envExpr = MolScriptBuilder.struct.modifier.exceptBy({
            0: MolScriptBuilder.struct.modifier.includeSurroundings({
                0: ligExpr, 'radius': LIGAND_ENVIRONMENT_RADIUS, 'as-whole-residues': true,
            }),
            by: ligExpr,
        });
        const wideEnvExpr = MolScriptBuilder.struct.modifier.includeConnected({
            0: envExpr, 'layer-count': LIGAND_WIDE_ENVIRONMENT_LAYERS, 'as-whole-residues': true,
        });
        const bondTest = MolScriptBuilder.core.flags.hasAny([
            MolScriptBuilder.struct.bondProperty.flags(),
            MolScriptBuilder.core.type.bitflags([BondType.Flag.Covalent | BondType.Flag.MetallicCoordination
                | BondType.Flag.HydrogenBond | BondType.Flag.Disulfide | BondType.Flag.Aromatic | BondType.Flag.Computed])
        ]); // taken from ligandPlusConnected (static component 'ligand')
        const linkageExpr = MolScriptBuilder.struct.modifier.intersectBy({
            0: MolScriptBuilder.struct.modifier.includeConnected({ 0: ligExpr, 'layer-count': 1, 'bond-test': bondTest }),
            by: MolScriptBuilder.struct.modifier.includeConnected({ 0: envExpr, 'layer-count': 1, 'bond-test': bondTest }),
        });

        const ligand = await this.makeComponent({
            type: { name: 'expression', params: ligExpr },
            label: ligandLabel
        }, options, `lig-${ligandLabel}`);
        const environment = await this.makeComponent({
            type: { name: 'expression', params: envExpr },
            label: envLabel
        }, options, `env-${ligandLabel}`);
        const wideEnvironment = await this.makeComponent({
            type: { name: 'expression', params: wideEnvExpr },
            label: 'Wider environment'
        }, options, `wide-${ligandLabel}`);
        const linkage = await this.makeComponent({
            type: { name: 'expression', params: linkageExpr },
            label: 'Linkage'
        }, options, `link-${ligandLabel}`);
        return new LigandEnvironmentComponents({ ligand, environment, wideEnvironment, linkage });
    }

    /** Split a stucture into entities, create a component for each entity */
    async makeEntities(entityInfo?: EntityInfo): Promise<{ [entityId: string]: StructureNode | undefined }> {
        entityInfo ??= getEntityInfo(this.data!);
        const selections: { [entityId: string]: StructureNode | undefined } = {};

        for (const entityId in entityInfo) {
            const description = entityInfo[entityId].description;
            const expression = MolScriptBuilder.struct.generator.atomGroups({
                'entity-test': MolScriptBuilder.core.rel.eq([MolScriptBuilder.struct.atomProperty.macromolecular.label_entity_id(), entityId])
            });
            const entitySelection = await this.makeComponent({
                type: { name: 'expression', params: expression },
                label: `Entity ${entityId} (${description})`
            }, undefined, `entity-${entityId}`);
            selections[entityId] = entitySelection;
        }
        return selections;
    }

    /** Create a component from a stucture, based on chainId (label_asym_id) */
    async makeChain(chainId: string, authChainId?: string): Promise<StructureNode | undefined> {
        const expression = MolScriptBuilder.struct.generator.atomGroups({
            'chain-test': MolScriptBuilder.core.rel.eq([MolScriptBuilder.struct.atomProperty.macromolecular.label_asym_id(), chainId])
        });
        return await this.makeComponent({
            type: { name: 'expression', params: expression },
            label: `Chain ${chainLabel(chainId, authChainId)}`,
        }, undefined, `chain-${chainId}`);
    }

    /** Create a component from a stucture, based on authChainId (auth_asym_id) */
    async makeAuthChain(authChainId: string, labelChainId?: string): Promise<StructureNode | undefined> {
        const expression = MolScriptBuilder.struct.generator.atomGroups({
            'chain-test': MolScriptBuilder.core.rel.eq([MolScriptBuilder.struct.atomProperty.macromolecular.auth_asym_id(), authChainId])
        });
        return await this.makeComponent({
            type: { name: 'expression', params: expression },
            label: `Chain ${chainLabel(labelChainId, authChainId)}`,
        }, undefined, `chain-auth-${authChainId}`);
    }

    /** Create a component from a stucture, based on a substructure definition */
    async makeSubstructure(id: string, def: SubstructureDef) {
        const expression = SubstructureDef.expression(def);
        return await this.makeComponent({
            type: { name: 'expression', params: expression },
            label: def.label ?? id,
        }, undefined, id);
    }

    /** Create multiple components from a stucture, based on substructure definitions */
    async makeSubstructures(subs: { [id: string]: SubstructureDef }, collapsed: boolean = false): Promise<{ [id: string]: StructureNode }> {
        const selections: { [id: string]: StructureNode } = {};
        for (const id in subs) {
            const selection = await this.makeSubstructure(id, subs[id]);
            if (selection) {
                selections[id] = selection;
                selection.setCollapsed(collapsed);
            }
        }
        return selections;
    }

    /** Create a visual node (3D representation) with this node as parent */
    async makeVisual(params: VisualParams, options: { allowLowestQuality?: boolean }, tags?: string[]): Promise<VisualNode> {
        const ref = this.childRef(params.type.name);
        params.type.params.quality ??= decideVisualQuality(this.data, options.allowLowestQuality ? 'lowest' : 'lower');
        const visual = await this.state.build().to(this.node).apply(StructureRepresentation3D, params, { ref, tags }).commit();
        return new VisualNode(visual);
    }
    /** Create a cartoon visual node with this node as parent */
    async makeCartoon(options: { allowLowestQuality?: boolean }, tags?: string[]): Promise<VisualNode> {
        return await this.makeVisual({
            type: { name: 'cartoon', params: { alpha: 1 } },
            colorTheme: { name: 'unit-index', params: { palette: paletteParam() } },
            sizeTheme: { name: 'uniform', params: { value: 1 } },
        }, options, tags);
    }
    /** Create a ball-and-stick visual node with this node as parent */
    async makeBallsAndSticks(options: { showHydrogens?: boolean, allowLowestQuality?: boolean }, tags?: string[]): Promise<VisualNode> {
        return await this.makeVisual({
            type: { name: 'ball-and-stick', params: { sizeFactor: STICK_SIZE_FACTOR, sizeAspectRatio: STICK_SIZE_ASPECT_RATIO, ignoreHydrogens: !options.showHydrogens } },
            colorTheme: { name: 'element-symbol', params: { carbonColor: { name: 'element-symbol', params: {} } } }, // in original: carbonColor: chain-id
            sizeTheme: { name: 'physical', params: {} },
        }, options, tags);
    }
    /** Create a carbohydrate visual (3D-SNFG) node with this node as parent */
    async makeCarbohydrate(options: { allowLowestQuality?: boolean }, tags?: string[]): Promise<VisualNode> {
        return await this.makeVisual({
            type: { name: 'carbohydrate', params: {} },
            colorTheme: { name: 'carbohydrate-symbol', params: {} },
            sizeTheme: { name: 'uniform', params: { value: 1 } },
        }, options, tags);
    }
}


/** Handle for Representation3D (aka visual) node */
export class VisualNode extends Node<PluginStateObject.Molecule.Structure.Representation3D> {
    /** Change params of this node.
     * `change` can be either new params directly or a function that will get current params and current node tags and should return new params. */
    async updateVisual(change: PPartial<VisualParams> | ((oldParams: VisualParams, tags: string[]) => PPartial<VisualParams>)): Promise<void> {
        const update = this.state.build();
        if (this.node.cell) {
            if (this.node.cell.transform.transformer !== StructureRepresentation3D) {
                throw new Error('Calling updateVisual on wrong transform');
            }
            const tags = this.node.cell?.transform.tags ?? [];
            update.to(this.node).update(
                StructureRepresentation3D,
                old => deepMerge(old, change instanceof Function ? change(old, tags) : change)
            );
        }
        await update.commit();
    }
    /** Change opacity of this visual */
    async setOpacity(alpha: number) {
        return this.updateVisual({
            type: { params: { alpha: alpha } },
        });
    }
    /** If this visual is ball-and-stick, make it thin */
    async setThinBallsAndSticks(sizeFactor: number) {
        return this.updateVisual({
            type: { params: { sizeFactor: sizeFactor, sizeAspectRatio: STICK_SIZE_ASPECT_RATIO } },
        });
    }
    /** Color this visual by entity ID. */
    async setColorByEntity(options?: { colorList?: Color[], ignoreElementColors?: boolean }) {
        const palette = paletteParam(options?.colorList);
        return this.updateVisual(old => ({
            colorTheme: (old.type.name === 'ball-and-stick' && !options?.ignoreElementColors) ?
                { name: 'element-symbol', params: { carbonColor: { name: 'entity-id', params: { palette } } } }
                : { name: 'entity-id', params: { palette } }
        }));
    }
    /** Color this visual by auth chain ID (i.e. copies of the same chain in an assembly will have the same color), color balls-and-sticks by element with chainId-colored carbons. */
    async setColorByChainId(options?: { colorList?: Color[], ignoreElementColors?: boolean }) {
        const palette = paletteParam(options?.colorList);
        return this.updateVisual(old => ({
            colorTheme: (old.type.name === 'ball-and-stick' && !options?.ignoreElementColors) ?
                { name: 'element-symbol', params: { carbonColor: { name: 'chain-id', params: { palette } } } }
                : { name: 'chain-id', params: { palette } }
        }));
    }
    /** Color this visual by chain instance (i.e. copies of the same chain in an assembly will have different colors), color balls-and-sticks by element with gray carbons. */
    async setColorByChainInstance(options?: { colorList?: Color[], ignoreElementColors?: boolean }) {
        const palette = paletteParam(options?.colorList);
        return this.updateVisual(old => ({
            colorTheme: (old.type.name === 'ball-and-stick' && !options?.ignoreElementColors) ?
                { name: 'element-symbol', params: { carbonColor: { name: 'unit-index', params: { palette } } } }
                : { name: 'unit-index', params: { palette } }
        }));
    }
    /** Color this visual with a single colore. */
    async setColorUniform(color: Color, options?: { ignoreElementColors: boolean }) {
        return this.updateVisual(old => ({
            colorTheme: (old.type.name === 'ball-and-stick' && !options?.ignoreElementColors) ?
                { name: 'element-symbol', params: { carbonColor: { name: 'uniform', params: { value: color } } } }
                : { name: 'uniform', params: { value: color } },
        }));
    }

    /** Color this visual by geometry validation info */
    async setColorByGeometryValidation(validationAvailable: boolean = true) {
        if (validationAvailable) {
            return await this.updateVisual({
                colorTheme: { name: 'pdbe-structure-quality-report' }
            });
        } else {
            return await this.setColorUniform(VALIDATION_UNAVAILABLE_COLOR);
        }
    }

    /** Color this visual by pLDDT values */
    async setColorByPlddt() {
        return this.updateVisual({
            colorTheme: { name: 'plddt-confidence', params: {} }
        });
    }

    /** Color this visual by B-factor values */
    async setColorByBfactor(colormap?: keyof typeof ColorLists | null) {
        const colorList = colormap === null ?
            null
            : { kind: 'interpolate', colors: ColorLists[colormap ?? 'plasma'].list.map(entry => (typeof entry === 'number') ? entry : entry[0]).reverse() };
        return this.updateVisual({
            colorTheme: {
                name: 'uncertainty',
                params: {
                    list: colorList
                }
            }
        });
    }

    /** Change this visual to putty type */
    async setPutty() {
        return this.updateVisual({
            type: { name: 'putty', params: { visuals: null } },
            sizeTheme: { name: 'uncertainty' }
        });
    }

    /** Change this visual to cartoon type */
    async setCartoon() {
        return this.updateVisual({
            type: { name: 'carton', params: { visuals: null } },
            sizeTheme: { name: 'uniform', params: null }
        });
    }


    /** Make this visual "faded", i.e. set grey color, lower opacity, and thinner.
     * Level 'normal' is basic fading with constant opacity;
     * level 'extra' is stronger fading with thinner cartoon (e.g. for wider ligand environment);
     * level 'size-dependent' sets opacity based on size of the whole structure (makes larger structures more transparent). */
    setFaded(level: 'normal' | 'size-dependent' | 'extra'): Promise<void> {
        const opacity = level === 'size-dependent' ? smartFadedOpacity(this.getStructure()?.root) : FADED_OPACITY;
        const sizeScale = level === 'extra' ? EXTRA_FADED_SIZE_SCALE : FADED_SIZE_SCALE;
        return this.updateVisual((old, tags) => ({
            type: {
                params: {
                    alpha: opacity * (tags.includes('branchedSticks') ? BRANCHED_STICKS_OPACITY : 1),
                }
            },
            colorTheme: { name: 'uniform', params: { value: FADED_COLOR } },
            sizeTheme: {
                params: old.sizeTheme.name === 'uniform' ? { value: sizeScale }
                    : old.sizeTheme.name === 'physical' ? { scale: sizeScale }
                        : {},
            },
        }));
    }
    /** Make this visual highlighted, i.e. set distinctive color, full opacity, set fat balls (if it's ball-and-stick) */
    setHighlight(color: Color = DEFAULT_HIGHLIGHT_COLOR): Promise<void> {
        return this.updateVisual((old, tags) => ({
            type: {
                params: {
                    alpha: tags.includes('branchedSticks') ? BRANCHED_STICKS_OPACITY : 1,
                    sizeFactor: (tags.includes('ligandSticks') || tags.includes('ionSticks') || tags.includes('modresSticks')) ?
                        HIGHTLIGHT_STICK_SIZE_FACTOR
                        : old.type.params.sizeFactor,
                }
            },
            colorTheme: { name: 'uniform', params: { value: color } }
        }));
    }

    /** Return structure from which this visual was created */
    private getStructure(): Structure | undefined {
        const structure = this.data?.sourceData as Structure | undefined;
        return (structure instanceof Structure) ? structure : undefined;
    }

}


/** Handle for manipulating multiple state tree nodes (siblings) */
abstract class NodeCollection<KeyType extends string, NodeType extends Node> {
    constructor(public readonly nodes: { [key in KeyType]: NodeType | undefined }) { }

    /** Apply a function to each of these nodes */
    async applyToAll(func: (node: NodeType) => any) {
        for (const key in this.nodes) {
            const node: NodeType | undefined = this.nodes[key];
            if (node) {
                await func(node);
            }
        }
    }
    /** Remove all these nodes from the state tree. */
    async dispose(): Promise<void> {
        await this.applyToAll(node => node.dispose());
    }
}


/** Collection of nodes for standard structure components (polymer, ligand...) */
export class StandardComponents extends NodeCollection<StandardComponentType, StructureNode> {
    /** Create visuals like polymer cartoon, ligand balls-and-sticks etc., for a structure or its part */
    async makeStandardVisuals(options: { showHydrogens?: boolean, showBranchedSticks?: boolean, allowLowestQuality?: boolean }): Promise<StandardVisuals> {
        const polymerCartoon = await this.nodes.polymer?.makeCartoon(options, ['polymerCartoon']);
        const branchedCarbohydrate = await this.nodes.branched?.makeCarbohydrate(options, ['branchedCarbohydrate']);
        const branchedSticks = options.showBranchedSticks ? await this.nodes.branched?.makeBallsAndSticks(options, ['branchedSticks']) : undefined;
        await branchedSticks?.setOpacity(BRANCHED_STICKS_OPACITY);
        const ligandSticks = await this.nodes.ligand?.makeBallsAndSticks(options, ['ligandSticks']);
        const ionSticks = await this.nodes.ion?.makeBallsAndSticks(options, ['ionSticks']);
        const nonstandardSticks = await this.nodes.nonstandard?.makeBallsAndSticks(options, ['nonstandardSticks']);
        return new StandardVisuals({
            polymerCartoon,
            branchedCarbohydrate,
            branchedSticks,
            ligandSticks,
            ionSticks,
            nonstandardSticks,
        });
    }
}

/** Collection of nodes for structure components for ligand visualization (ligand, environment, wider enviroment...) */
export class LigandEnvironmentComponents extends NodeCollection<LigEnvComponentType, StructureNode> {
    /** Create visuals like ligand balls-and-sticks, wider enviroment cartoon... */
    async makeLigEnvVisuals(options: { showHydrogens?: boolean, allowLowestQuality?: boolean, entityColors?: Color[] }): Promise<LigandEnvironmentVisuals> {
        const ligandSticks = await this.nodes.ligand?.makeBallsAndSticks(options, ['ligandSticks']);
        await ligandSticks?.setColorByEntity({ colorList: options.entityColors ?? ENTITY_COLORS });
        const environmentSticks = await this.nodes.environment?.makeBallsAndSticks(options, ['environmentSticks']);
        await environmentSticks?.setThinBallsAndSticks(ENVIRONMENT_STICK_SIZE_FACTOR);
        const linkageSticks = await this.nodes.linkage?.makeBallsAndSticks(options, ['linkageSticks']);
        await linkageSticks?.setThinBallsAndSticks(ENVIRONMENT_STICK_SIZE_FACTOR);
        const wideEnvironmentCartoon = await this.nodes.wideEnvironment?.makeCartoon(options, ['wideEnvironmentCartoon']);
        await wideEnvironmentCartoon?.setFaded('extra');

        return new LigandEnvironmentVisuals({
            ligandSticks,
            environmentSticks,
            wideEnvironmentCartoon,
            linkageSticks,
        });
    }
}


/** Collection of nodes for standard structure component visuals like polymer cartoon, ligand balls-and-sticks... */
export class StandardVisuals extends NodeCollection<StandardVisualType, VisualNode> {
}

/** Collection of nodes for visuals for ligand visualization (ligand balls-and-sticks, wider enviroment cartoon, ...) */
export class LigandEnvironmentVisuals extends NodeCollection<LigEnvVisualType, VisualNode> {
}


/** Decide quality (e.g. 'medium', 'low, 'lowest'...) based on the size of the structure itself (i.e. the visualized part),
 * not based on its root (i.e. the whole model) as 'auto' does */
function decideVisualQuality(structure: Structure | undefined, minimumQuality: 'lower' | 'lowest') {
    if (structure) {
        const thresholds = (minimumQuality === 'lower') ? { lowestElementCount: Number.POSITIVE_INFINITY } : {};
        return getStructureQuality(structure, thresholds);
    } else {
        return 'auto';
    }
}

/** Create value that can be passed as the `palette` params when creating/updating a visual node */
function paletteParam(colorList?: Color[]) {
    return {
        name: 'colors',
        params: { list: { kind: 'set', colors: colorList ?? DEFAULT_COLORS } }
    };
}

/** Calculate optimal opacity of a visual based on structure size. */
function smartFadedOpacity(structure: Structure | undefined, params: typeof SMART_FADED_OPACITY_PARAMS = SMART_FADED_OPACITY_PARAMS) {
    const { targetOpacity, baseOpacity, n0 } = params;
    const nRes = structure?.polymerResidueCount ?? 0;
    // The formula is derived from Lamber-Beer law:
    // -log(1 - targetOpacity) = -log(I/I0) = A = epsilon c l,
    // assuming that optical path length l is proportional to cube root of residue count.
    // This is of course very simplified.
    // Artificial parameters `n0` and `baseOpacity` are to avoid too high/low opacity for tiny/huge structures.
    const theoreticalOpacity = 1 - (1 - targetOpacity) ** (1 / (n0 + nRes) ** (1 / 3));
    return baseOpacity + theoreticalOpacity;
}

/** Apply a function to node or node collection and dispose (remove from the tree) it afterwards.
 * (This is to allow context-manager syntax and avoid forgetting to remove node once it is not necessary) */
export async function using<T extends Node | NodeCollection<any, any> | undefined, Y>(node: T | Promise<T>, func: (resource: T) => Y | Promise<Y>): Promise<Y> {
    const awNode = await node;
    try {
        return await func(awNode);
    } finally {
        await awNode?.dispose();
    }
}


/** Helper functions for managing state tree node references in a deterministic and human-friendly way,
 * e.g. '!1hda', '!1hda/model-0/props/struct-model/whole-entry'. */
namespace References {
    /** Symbol to start all managed refs */
    const REF_INIT = '!';
    /** Symbol to separate tokens in managed refs */
    const REF_SEP = '/';

    /** Check if desiredRef is already in the state tree and provide an alternative if so (e.g. 'blabla' -> 'blabla(1)') */
    export function unique(state: State, desiredRef: string | undefined): string | undefined {
        if (!desiredRef) return desiredRef;
        let ref = desiredRef;
        let counter = 0;
        while (state.cells.has(ref)) {
            ref = `${desiredRef}(${++counter})`;
        }
        return ref;
    }

    /** Get a human-friendly reference for a subtree "root". */
    export function base(name?: string): string | undefined {
        if (!name) return undefined; // use automatic ref assignment
        return REF_INIT + name;
    }

    /** Get a human-friendly reference for a child of another node. */
    export function child(parentRef: string | undefined, suffix: string, replaceOldSuffix?: boolean): string | undefined {
        if (!parentRef || !parentRef.startsWith(REF_INIT)) return undefined; // use automatic ref assignment
        if (replaceOldSuffix) {
            const oldSuffixPosition = parentRef.lastIndexOf(REF_SEP);
            if (oldSuffixPosition > 0) { // if oldSuffixPosition===0, it is not REF_SEP but REF_INIT
                parentRef = parentRef.substring(0, oldSuffixPosition);
            }
        }
        return parentRef + REF_SEP + suffix;
    }
}
