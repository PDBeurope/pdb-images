import { Structure } from 'molstar/lib/mol-model/structure';
import { BondType } from 'molstar/lib/mol-model/structure/model/types';
import { RootStructureDefinition } from 'molstar/lib/mol-plugin-state/helpers/root-structure';
import { StructureComponentParams } from 'molstar/lib/mol-plugin-state/helpers/structure-component';
import { PluginStateObject } from 'molstar/lib/mol-plugin-state/objects';
import { Download, ParseCif } from 'molstar/lib/mol-plugin-state/transforms/data';
import { CreateGroup } from 'molstar/lib/mol-plugin-state/transforms/misc';
import { CustomModelProperties, ModelFromTrajectory, StructureComponent, StructureFromModel, TrajectoryFromMmCif } from 'molstar/lib/mol-plugin-state/transforms/model';
import { StructureRepresentation3D } from 'molstar/lib/mol-plugin-state/transforms/representation';
import { setSubtreeVisibility } from 'molstar/lib/mol-plugin/behavior/static/state';
import { PluginContext } from 'molstar/lib/mol-plugin/context';
import { getStructureQuality } from 'molstar/lib/mol-repr/util';
import { MolScriptBuilder } from 'molstar/lib/mol-script/language/builder';
import { StateObject, StateObjectSelector, StateTransform } from 'molstar/lib/mol-state';
import { Color } from 'molstar/lib/mol-util/color';
import { ColorLists } from 'molstar/lib/mol-util/color/lists';
import { ParamDefinition } from 'molstar/lib/mol-util/param-definition';

import { PDBeAPI } from './api';
import { DEFAULT_COLORS, ENTITY_COLORS } from './helpers/colors';
import { chainLabel, deepMerge, PPartial, toKebabCase } from './helpers/helpers';
import { baseRef, childRef, uniqueRef } from './helpers/references';
import { EntityInfo, getEntityInfo, LigandInstanceInfo } from './helpers/structure-info';
import { SubstructureDef } from './helpers/substructure-def';


const LIGAND_ENVIRONMENT_RADIUS = 5; // Angstroms
const LIGAND_WIDE_ENVIRONMENT_LAYERS = 2; // number of added connected residues
const BRANCHED_STICKS_OPACITY = 0.5;

const HIGHLIGHT_COLOR = Color.fromRgb(40, 100, 255);
const FADED_COLOR = Color.fromRgb(120, 120, 120);
const FADED_OPACITY = 0.5;
const FADED_SIZE_SCALE = 0.9;
const EXTRA_FADED_SIZE_SCALE = 0.4;

const BALL_SIZE_FACTOR = 0.25;
const HIGHTLIGHT_BALL_SIZE_FACTOR = 0.75;
/** For ligand environments */
const ENVIRONMENT_BALL_SIZE_FACTOR = 0.11;

/** Set true to allow any quality level for visuals (including 'lowest', which is really ugly).
 * Set false to allow only 'lower' and better. */
const ALLOW_LOWEST_QUALITY = false;


export type StructureObjSelector = StateObjectSelector<PluginStateObject.Molecule.Structure, any>

type StandardComponentType = 'polymer' | 'ligand' | 'branched' | 'ion'
type LigEnvComponentType = 'ligand' | 'environment' | 'wideEnvironment' | 'linkage'
type StandardVisualType = 'polymerCartoon' | 'ligandSticks' | 'branchedCarbohydrate' | 'branchedSticks' | 'ionSticks'
type LigEnvVisualType = 'ligandSticks' | 'environmentSticks' | 'linkageSticks' | 'wideEnvironmentCartoon'

type StructureParams = ParamDefinition.Values<ReturnType<typeof RootStructureDefinition.getParams>>
type VisualParams = ReturnType<typeof StructureRepresentation3D.createDefaultParams>


abstract class Node<S extends StateObject = StateObject> {
    readonly origin: StateObjectSelector<S, any>;
    readonly node: StateObjectSelector<S, any> | StateObjectSelector<PluginStateObject.Group, any>;
    protected constructor(origin: StateObjectSelector<S, any>, group?: StateObjectSelector<PluginStateObject.Group, any>) {
        this.origin = origin;
        this.node = group ?? origin;
    }
    get state() {
        const state = this.node.state;
        if (!state) throw new Error('state is undefined');
        return state;
    }
    get data() { return this.origin.data; }

    async makeGroup(params?: { label?: string, description?: string }, stateOptions?: Partial<StateTransform.Options>): Promise<this> {
        const refSuffix = params?.label ? toKebabCase(params.label) : 'group';
        const ref = this.childRef(refSuffix);
        const groupNode = await this.state.build().to(this.node).apply(CreateGroup, params, { ref, ...stateOptions }).commit();
        return Object.getPrototypeOf(this).constructor(this.origin, groupNode);
    }
    setVisible(visible: boolean): void {
        if (this.node.cell) {
            setSubtreeVisibility(this.state, this.node.cell.transform.ref, !visible); // true means hide, ¯\_(ツ)_/¯
        }
    }
    setCollapsed(collapsed: boolean): void {
        if (this.node.cell) {
            this.state.updateCellState(this.node.ref, { isCollapsed: collapsed });
        }
    }
    setGhost(ghost: boolean): void {
        if (this.node.cell) {
            this.state.updateCellState(this.node.ref, { isGhost: ghost });
        }
    }
    /** Create a ref string for a new node. */
    protected baseRef(idForRef?: string): string | undefined {
        return uniqueRef(this.state, baseRef(idForRef));
    }
    /** Create a ref string for a new node which will be a child of this node. */
    protected childRef(suffix: string, replaceOldSuffix?: boolean): string | undefined {
        return uniqueRef(this.state, childRef(this.node.ref, suffix, replaceOldSuffix));
    }
    /** Remove this node from the state tree. */
    async dispose(): Promise<void> {
        await this.state.build().delete(this.node).commit();
    }
}

export class RootNode extends Node<PluginStateObject.Root> {
    static create(plugin: PluginContext) {
        return new RootNode(new StateObjectSelector(plugin.state.data.root.transform.ref, plugin.state.data));
    }
    async makeDownload(params: { url: string, isBinary: boolean }, idForRef?: string): Promise<DataNode> {
        const ref = this.baseRef(idForRef);
        const dataNode = await this.state.build().to(this.node).apply(Download, params, { ref }).commit();
        if (!dataNode.data) throw new Error(`Failed to download data from ${params.url}`);
        return new DataNode(dataNode);
    }
}

export class DataNode extends Node<PluginStateObject.Data.Binary | PluginStateObject.Data.String> {
    async makeCif(): Promise<CifNode> {
        const ref = this.childRef('cif', true);
        const cifNode = await this.state.build().to(this.node).apply(ParseCif, undefined, { ref }).commit();
        return new CifNode(cifNode);
    }
}

export class CifNode extends Node<PluginStateObject.Format.Cif> {
    async makeTrajectory(): Promise<TrajectoryNode> {
        const ref = this.childRef('traj', true);
        const trajNode = await this.state.build().to(this.node).apply(TrajectoryFromMmCif, undefined, { ref }).commit();
        return new TrajectoryNode(trajNode);
    }
}

export class TrajectoryNode extends Node<PluginStateObject.Molecule.Trajectory> {
    async makeModel(modelIndex: number = 0): Promise<ModelNode> {
        const ref = this.childRef(`model-${modelIndex}`, true);
        const modelNode = await this.state.build().to(this.node).apply(ModelFromTrajectory, { modelIndex }, { ref }).commit();
        return new ModelNode(modelNode);
    }
}
export class ModelNode extends Node<PluginStateObject.Molecule.Model> {
    async makeCustomModelProperties(api?: PDBeAPI): Promise<ModelNode> {
        const ref = this.childRef('props');
        const customPropsNode = await this.state.build().to(this.node).apply(CustomModelProperties, {
            properties: {
                pdbe_structure_quality_report: {
                    serverUrl: (api && !api.noApi) ? api?.pdbeStructureQualityReportPrefix() : undefined
                }
            }
        }, { ref }).commit();
        return new ModelNode(customPropsNode);
    }
    async makeStructure(params: StructureParams): Promise<StructureNode> {
        let refSuffix = `struct-${params.type.name}`;
        if (params.type.name === 'assembly') refSuffix += `-${params.type.params.id}`;
        const ref = this.childRef(refSuffix);
        const structure = await this.state.build().to(this.node).apply(StructureFromModel, params, { ref }).commit();
        return new StructureNode(structure);
    }
}

export class StructureNode extends Node<PluginStateObject.Molecule.Structure> {
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
    /** Create components "polymer", "branched", "ligand", "ion" for a structure or its part */
    async makeStandardComponents(): Promise<StandardComponents> {
        const polymer = await this.makeComponent({ type: { name: 'static', params: 'polymer' } }, undefined, 'polymer');
        const ligand = await this.makeComponent({ type: { name: 'static', params: 'ligand' } }, undefined, 'ligand');
        const branched = await this.makeComponent({ type: { name: 'static', params: 'branched' } }, undefined, 'branched');
        const ion = await this.makeComponent({ type: { name: 'static', params: 'ion' } }, undefined, 'ion');
        return new StandardComponents({ polymer, branched, ligand, ion });
    }
    /** Create components "ligand" and "environment" for a ligand */
    async makeLigEnvComponents(ligandInfo: LigandInstanceInfo, options?: Partial<StateTransform.Options>): Promise<LigandEnvironmentComponents> {
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
    async makeEntities(entityInfo?: EntityInfo): Promise<{ [entityId: string]: StructureNode }> {
        entityInfo ??= getEntityInfo(this.data!);
        const selections: { [entityId: string]: StructureNode } = {};

        for (const entityId in entityInfo) {
            const description = entityInfo[entityId].description;
            const expression = MolScriptBuilder.struct.generator.atomGroups({
                'entity-test': MolScriptBuilder.core.rel.eq([MolScriptBuilder.struct.atomProperty.macromolecular.label_entity_id(), entityId])
            });
            const entitySelection = await this.makeComponent({
                type: { name: 'expression', params: expression },
                label: `Entity ${entityId} (${description})`
            }, undefined, `entity-${entityId}`);
            if (entitySelection) {
                selections[entityId] = entitySelection;
            }
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
    async makeSubstructures(subs: { [id: string]: SubstructureDef }): Promise<{ [id: string]: StructureNode }> {
        const selections: { [id: string]: StructureNode } = {};
        for (const id in subs) {
            const selection = await this.makeSubstructure(id, subs[id]);
            if (selection) {
                selections[id] = selection;
            }
        }
        return selections;
    }

    async makeVisual(params: VisualParams, tags?: string[]): Promise<VisualNode> {
        const ref = this.childRef(params.type.name);
        params.type.params.quality ??= decideVisualQuality(this.data);
        const visual = await this.state.build().to(this.node).apply(StructureRepresentation3D, params, { ref, tags }).commit();
        return new VisualNode(visual);
    }
    async makeCartoon(tags?: string[]): Promise<VisualNode> {
        return await this.makeVisual({
            type: { name: 'cartoon', params: { alpha: 1 } },
            colorTheme: { name: 'unit-index', params: { palette: paletteParam() } },
            sizeTheme: { name: 'uniform', params: { value: 1 } },
        }, tags);
    }
    async makeBallsAndSticks(tags?: string[]): Promise<VisualNode> {
        return await this.makeVisual({
            type: { name: 'ball-and-stick', params: { sizeFactor: BALL_SIZE_FACTOR, sizeAspectRatio: 0.5 } },
            colorTheme: { name: 'element-symbol', params: { carbonColor: { name: 'element-symbol', params: {} } } }, // in original: carbonColor: chain-id
            sizeTheme: { name: 'physical', params: {} },
        }, tags);
    }
    async makeCarbohydrate(tags?: string[]): Promise<VisualNode> {
        return await this.makeVisual({
            type: { name: 'carbohydrate', params: {} },
            colorTheme: { name: 'carbohydrate-symbol', params: {} },
            sizeTheme: { name: 'uniform', params: { value: 1 } },
        }, tags);
    }
}

export class VisualNode extends Node<PluginStateObject.Molecule.Structure.Representation3D> {
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
    async setOpacity(alpha: number) {
        return this.updateVisual({
            type: { params: { alpha: alpha } },
        });
    }
    async setThinSticks(sizeFactor: number) {
        return this.updateVisual({
            type: { params: { sizeFactor: sizeFactor, sizeAspectRatio: 0.5 } },
        });
    }
    async setColorByEntity(options?: { ignoreElementColors?: boolean, colorList?: Color[] }) {
        const palette = paletteParam(options?.colorList);
        return this.updateVisual(old => ({
            colorTheme: (old.type.name === 'ball-and-stick' && !options?.ignoreElementColors) ?
                { name: 'element-symbol', params: { carbonColor: { name: 'entity-id', params: { palette } } } }
                : { name: 'entity-id', params: { palette } }
        }));
    }
    /** Color visuals by auth chain ID (i.e. copies of the same chain in an assembly will have the same color), color balls-and-sticks by element with chainId-colored carbons. */
    async setColorByChainId(options?: { ignoreElementColors?: boolean, colorList?: Color[] }) {
        const palette = paletteParam(options?.colorList);
        return this.updateVisual(old => ({
            colorTheme: (old.type.name === 'ball-and-stick' && !options?.ignoreElementColors) ?
                { name: 'element-symbol', params: { carbonColor: { name: 'chain-id', params: { palette } } } }
                : { name: 'chain-id', params: { palette } }
        }));
    }
    /** Color visuals by chain instance (i.e. copies of the same chain in an assembly will have different colors), color balls-and-sticks by element with gray carbons. */
    async setColorByChainInstance(options?: { ignoreElementColors?: boolean, colorList?: Color[], entityColorList?: Color[] }) {
        const palette = paletteParam(options?.colorList);
        return this.updateVisual(old => ({
            colorTheme: (old.type.name === 'ball-and-stick' && !options?.ignoreElementColors) ?
                { name: 'element-symbol', params: { carbonColor: (options?.entityColorList) ? { name: 'entity-id', params: { palette: paletteParam(options.entityColorList) } } : { name: 'element-symbol', params: {} } } } // 'unit-index' is not available for carbonColor :(
                : { name: 'unit-index', params: { palette } }
        }));
    }
    async setColorUniform(color: Color, options?: { ignoreElementColors: boolean }) {
        return this.updateVisual(old => ({
            colorTheme: (old.type.name === 'ball-and-stick' && !options?.ignoreElementColors) ?
                { name: 'element-symbol', params: { carbonColor: { name: 'uniform', params: { value: color } } } }
                : { name: 'uniform', params: { value: color } },
        }));
    }

    async setColorByGeometryValidation() {
        return this.updateVisual({
            colorTheme: { name: 'pdbe-structure-quality-report' }
        });
    }

    async setColorByPlddt() {
        return this.updateVisual({
            colorTheme: { name: 'plddt-confidence', params: {} }
        });
    }

    async setPutty() {
        return this.updateVisual({
            type: { name: 'putty', params: { visuals: null } },
            sizeTheme: { name: 'uncertainty' }
        });
    }

    async setCartoon() {
        return this.updateVisual({
            type: { name: 'carton', params: { visuals: null } },
            sizeTheme: { name: 'uniform', params: null }
        });
    }

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

    setFaded(level: 1 | 2 = 1): Promise<void> {
        const sizeScale = level === 1 ? FADED_SIZE_SCALE : EXTRA_FADED_SIZE_SCALE;
        return this.updateVisual((old, tags) => ({
            type: {
                params: {
                    alpha: FADED_OPACITY * (tags.includes('branchedSticks') ? BRANCHED_STICKS_OPACITY : 1),
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
    setHighlight(color: Color = HIGHLIGHT_COLOR): Promise<void> {
        return this.updateVisual((old, tags) => ({
            type: {
                params: {
                    alpha: tags.includes('branchedSticks') ? BRANCHED_STICKS_OPACITY : 1,
                    sizeFactor: (tags.includes('ligandSticks') || tags.includes('ionSticks') || tags.includes('modresSticks')) ?
                        HIGHTLIGHT_BALL_SIZE_FACTOR
                        : old.type.params.sizeFactor,
                }
            },
            colorTheme: { name: 'uniform', params: { value: color } }
        }));
    }

}
abstract class NodeCollection<KeyType extends string, NodeType extends Node> {
    constructor(public readonly nodes: { [key in KeyType]: NodeType | undefined }) { }

    async applyToAll(func: (node: NodeType) => any) {
        for (const key in this.nodes) {
            const node: NodeType | undefined = this.nodes[key];
            if (node) {
                await func(node);
            }
        }
    }
    async dispose(): Promise<void> {
        await this.applyToAll(node => node.dispose());
    }
}

export class StandardComponents extends NodeCollection<StandardComponentType, StructureNode> {
    /** Create visuals like polymer cartoon, ligand balls-and-sticks etc., for a structure or its part */
    async makeStandardVisuals(): Promise<StandardVisuals> {
        const polymerCartoon = await this.nodes.polymer?.makeCartoon(['polymerCartoon']);
        const branchedCarbohydrate = await this.nodes.branched?.makeCarbohydrate(['branchedCarbohydrate']);
        const branchedSticks = await this.nodes.branched?.makeBallsAndSticks(['branchedSticks']);
        await branchedSticks?.setOpacity(BRANCHED_STICKS_OPACITY);
        const ligandSticks = await this.nodes.ligand?.makeBallsAndSticks(['ligandSticks']);
        const ionSticks = await this.nodes.ion?.makeBallsAndSticks(['ionSticks']);
        return new StandardVisuals({
            polymerCartoon,
            branchedCarbohydrate,
            branchedSticks,
            ligandSticks,
            ionSticks,
        });
    }
}
export class LigandEnvironmentComponents extends NodeCollection<LigEnvComponentType, StructureNode> {
    /** Create visuals like polymer cartoon, ligand balls-and-sticks etc., for a structure or its part */
    async makeLigEnvVisuals(entityColors?: Color[]): Promise<LigandEnvironmentVisuals> {
        const ligandSticks = await this.nodes.ligand?.makeBallsAndSticks(['ligandSticks']);
        await ligandSticks?.setColorByEntity({ colorList: entityColors ?? ENTITY_COLORS });
        const environmentSticks = await this.nodes.environment?.makeBallsAndSticks(['environmentSticks']);
        await environmentSticks?.setThinSticks(ENVIRONMENT_BALL_SIZE_FACTOR);
        const linkageSticks = await this.nodes.linkage?.makeBallsAndSticks(['linkageSticks']);
        await linkageSticks?.setThinSticks(ENVIRONMENT_BALL_SIZE_FACTOR);
        const wideEnvironmentCartoon = await this.nodes.wideEnvironment?.makeCartoon(['wideEnvironmentCartoon']);
        await wideEnvironmentCartoon?.setFaded(2);

        return new LigandEnvironmentVisuals({
            ligandSticks,
            environmentSticks,
            wideEnvironmentCartoon,
            linkageSticks,
        });
    }
}

export class StandardVisuals extends NodeCollection<StandardVisualType, VisualNode> {
}

export class LigandEnvironmentVisuals extends NodeCollection<LigEnvVisualType, VisualNode> {
}


/** Decide quality (e.g. 'medium', 'low, 'lowest'...) based on the size of the structure itself (i.e. the visualized part),
 * not based on its root (i.e. the whole model) as 'auto' does */
function decideVisualQuality(structure: Structure | undefined) {
    if (structure) {
        const thresholds = ALLOW_LOWEST_QUALITY ? {} : { lowestElementCount: Number.POSITIVE_INFINITY };
        return getStructureQuality(structure, thresholds);
    } else {
        return 'auto';
    }
}

function paletteParam(colorList?: Color[]) {
    return {
        name: 'colors',
        params: { list: { kind: 'set', colors: colorList ?? DEFAULT_COLORS } }
    };
}

export async function using<T extends Node | NodeCollection<any, any> | undefined, Y>(node: T | Promise<T>, func: (resource: T) => Y | Promise<Y>): Promise<Y> {
    const awNode = await node;
    try {
        return await func(awNode);
    } finally {
        await awNode?.dispose();
    }
}
