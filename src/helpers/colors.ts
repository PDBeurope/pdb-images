/**
 * Copyright (c) 2023 EMBL - European Bioinformatics Institute, licensed under Apache 2.0, see LICENSE file for more info.
 *
 * @author Adam Midlik <midlik@gmail.com>
 */

import { Mat3, Vec3 } from 'molstar/lib/commonjs/mol-math/linear-algebra';
import { Structure } from 'molstar/lib/commonjs/mol-model/structure';
import { ElementSymbolColors } from 'molstar/lib/commonjs/mol-theme/color/element-symbol';
import { Color, ColorListEntry } from 'molstar/lib/commonjs/mol-util/color/color';
import { ColorLists } from 'molstar/lib/commonjs/mol-util/color/lists';
import { Hcl } from 'molstar/lib/commonjs/mol-util/color/spaces/hcl';
import { getElementsInChains, getEntityInfo } from './structure-info';


const SET1 = colorArray(ColorLists['set-1'].list.slice(0, 8)); // Discard the last color (gray)
const SET2 = colorArray(ColorLists['set-2'].list.slice(0, 7)); // Discard the last color (gray)
const DARK2 = colorArray(ColorLists['dark-2'].list.slice(0, 7)); // Discard the last color (gray)

const SET1_SAFE = [SET1[2], SET1[3], SET1[4], SET1[6], SET1[7]]; // Discard colors that conflict with element coloring (red oxygen, blue nitrogen, yellow sulfur)
const SET2_SAFE = [SET2[6], SET2[0], SET2[1], SET2[2], SET2[3], SET2[4]]; // Discard colors that conflict with element coloring (yellow sulfur), move the poopish #6 as first, so is drawn as last

// Plotly palettes
const VIVID = [0xe58606, 0x5d69b1, 0x52bca3, 0x99c945, 0xcc61b0, 0x24796c, 0xdaa51b, 0x764e9f, 0xed645a] as Color[]; // Dropped the last color (0xa5aa99 gray) and 0x2f8ac4 blue (too similir to the blue in Set1)
const BOLD = [0x7f3c8d, 0x11a579, 0x3969ac, 0xf2b701, 0xe73f74, 0x80ba5a, 0xe68310, 0x008695, 0xcf1c90, 0xf97b72] as Color[]; // Dropped the last color (0xa5aa99 gray)
const PASTEL = [0x66c5cc, 0xf6cf71, 0xf89c74, 0xdcb0f2, 0x87c55f, 0x9eb9f3, 0xfe88b1, 0xc9db74, 0x8be0a4, 0xb497e7] as Color[]; // Dropped the last color (0xb3b3b3 gray)


/** A set of non-gray colors starting with relatively decent colors, for polymer entities */
export const ENTITY_COLORS = [...DARK2, ...BOLD, ...PASTEL, ...SET2_SAFE];

/** A set of non-gray colors starting with pastel colors, for ligands (same as for polymers but drawn from the end) */
export const LIGAND_COLORS = ENTITY_COLORS.slice().reverse();

/** A set of non-gray colors starting with brighter colors, for highlighting domains */
export const ANNOTATION_COLORS = [...SET1, ...VIVID];

/** A set of non-gray colors starting with brighter colors, for modified residues (same as for domains but drawn from the end) */
export const MODRES_COLORS = ANNOTATION_COLORS.slice().reverse();

export const DEFAULT_COLORS = ENTITY_COLORS;


/** Iterate over the elements of `values` in a cycle (forever). */
export function* cycleIterator<T>(values: T[]) {
    let counter = 0;
    while (true) {
        yield values[counter];
        counter = (counter + 1) % values.length;
    }
}

/** Assign colors to entities and to units (i.e. chain instances) in a structure.
 * Unit colors are assigned based on the entity colors: the first unit of an entity
 * has always the same color as that entity, other units have similar but distinct
 * colors ("sister colors"). */
export function assignEntityAndUnitColors(structure: Structure) {
    const polymerColors = cycleIterator(ENTITY_COLORS);
    const ligandColors = cycleIterator(LIGAND_COLORS);
    const waterColor = ElementSymbolColors.O;

    structure = structure.parent ?? structure;

    const entityInfo = getEntityInfo(structure);
    const entities = structure.model.entities;
    const entityColors: Color[] = [];
    const entityIndex: { [entityId: string]: number } = {};
    for (let i = 0; i < entities.data._rowCount; i++) {
        const id = entities.data.id.value(i);
        const typ = entities.data.type.value(i);
        const elementSymbols = getElementsInChains(structure, entityInfo[id]?.chains ?? []);
        let color: Color | undefined;
        if (typ === 'water') {
            color = waterColor;
        }
        if (!color && elementSymbols.length === 1) {
            color = ElementSymbolColors[elementSymbols[0] as keyof ElementSymbolColors]; // might be undefined!
        }
        if (!color && typ === 'non-polymer') {
            color = ligandColors.next().value!;
        }
        if (!color) {
            color = polymerColors.next().value!;
        }
        entityColors.push(color);
        entityIndex[id] = i;
    }

    const unitColors = [];
    const entityInstanceCounters: { [entityId: string]: number } = {};
    for (const unit of structure.units ?? []) {
        const firstElementIdx = unit.elements[0];
        const chainIdx = unit.model.atomicHierarchy.chainAtomSegments.index[firstElementIdx];
        const entityId = unit.model.atomicHierarchy.chains.label_entity_id.value(chainIdx);
        const baseColor = entityColors[entityIndex[entityId]];
        entityInstanceCounters[entityId] ??= 0;
        const color = SisterColors.getSisterColor(baseColor, entityInstanceCounters[entityId]++);
        unitColors.push(color);
    }
    return { entities: entityColors, units: unitColors };
}

/** Convert an array of ColorListEntries into Colors. */
function colorArray(colors: ColorListEntry[]): Color[] {
    return colors.map(entry => (typeof entry === 'number') ? entry : entry[0]);
}


/** Ad-hoc color space similar to HSL or HCL. The name PSL is just not to confuse it with HSL.
 * A bit smarter that HSL (tries to compensate for different luminosities of red, green, and blue),
 * avoids the issue of HCL when lighter blue becomes cyan. */
namespace PslColors {
    /** Red-green-blue color with values [0...1] */
    interface RGB extends Array<number> { [d: number]: number, '@type': 'rgb', length: 3 }
    /** X-Y-luminosity color with values [-1...1] for X, Y, [0...1] for L */
    interface XYL extends Array<number> { [d: number]: number, '@type': 'xyl', length: 3 }
    /** Phase-saturation-luminosity color with values [0, 360] for P (~hue), [0, 1] for S (~saturation), [0...1] for L */
    export interface PSL extends Array<number> { [d: number]: number, '@type': 'psl', length: 3 }

    function RGB(r: number, g: number, b: number) { return [r, g, b] as RGB; }
    function XYL(x: number, y: number, l: number) { return [x, y, l] as XYL; }
    export function PSL(phi: number, sat: number, l: number) { return [phi, sat, l] as PSL; }

    function defineMatrices() {
        const luminosities = { r: 0.32, g: 0.57, b: 0.11 }; // These luminosities are based on a simple Chrome Colorblindly comparison
        const r = [1, 0, luminosities.r] as const;
        const g = [-0.5, Math.sin(Math.PI / 3), luminosities.g] as const;
        const b = [-0.5, -Math.sin(Math.PI / 3), luminosities.b] as const;
        const mRgbToXyl = Mat3.create(...r, ...g, ...b);
        const mXylToRgb = Mat3.invert(Mat3(), mRgbToXyl);
        return { mRgbToXyl, mXylToRgb };
    }
    const { mRgbToXyl, mXylToRgb } = defineMatrices();

    function rgbToXyl(rgb: RGB): XYL {
        return Vec3.transformMat3(Vec3(), rgb as any, mRgbToXyl) as any;
    }
    function xylToRgb(xyl: XYL): RGB {
        return Vec3.transformMat3(Vec3(), xyl as any, mXylToRgb) as any;
    }
    function rgbToColor(rgb: RGB): Color {
        let [r, g, b] = rgb;
        r = Math.max(0, Math.min(1, r));
        g = Math.max(0, Math.min(1, g));
        b = Math.max(0, Math.min(1, b));
        return Color.fromNormalizedRgb(r, g, b);
    }
    function getSat(x: number, y: number, l: number) {
        const [dr, dg, db] = xylToRgb(XYL(x, y, 0));
        let sat = 0;
        if (l > 0 && l < 1) {
            if (dr > 0) sat = Math.max(sat, dr / (1 - l));
            if (dr < 0) sat = Math.max(sat, -dr / l);
            if (dg > 0) sat = Math.max(sat, dg / (1 - l));
            if (dg < 0) sat = Math.max(sat, -dg / l);
            if (db > 0) sat = Math.max(sat, db / (1 - l));
            if (db < 0) sat = Math.max(sat, -db / l);
            if (sat < 0) throw new Error('AssertionError');
        }
        return sat;
    }
    function rgbToPsl(rgb: RGB) {
        const [x, y, l] = rgbToXyl(rgb);
        let phi = (180 / Math.PI) * Math.atan2(y, x);
        if (phi < 0) phi += 360;
        const sat = Math.min(getSat(x, y, l), 1);
        return PSL(phi, sat, l);
    }
    function pslToRgb(psl: PSL) {
        const [phi, sat, l] = psl;
        if (l === 0) return RGB(0, 0, 0);
        if (l === 1) return RGB(1, 1, 1);
        if (sat === 0) return RGB(l, l, l); // necessary?
        const x0 = Math.cos(Math.PI / 180 * phi);
        const y0 = Math.sin(Math.PI / 180 * phi);
        const normSat = getSat(x0, y0, l);
        const x = sat * x0 / normSat;
        const y = sat * y0 / normSat;
        return xylToRgb(XYL(x, y, l));
    }
    export function pslToColor(psl: PSL): Color {
        return rgbToColor(pslToRgb(psl));
    }
    export function colorToPsl(color: Color): PSL {
        return rgbToPsl(RGB(...Color.toRgbNormalized(color)));
    }
}


namespace SisterColors {
    const DEFAULT_SISTER_COLOR_PARAMS = {
        hueRadius: 90,
        satRadius: 0.3,
        satMin: 0.2,
        satMax: 1.0,
        lumRadius: 0.25,
        lumMin: 0.1,
        lumMax: 0.9,
    };

    /** Get i-th "sister color" for the given base color.
     * The sister colors are similar to the base color but slightly differ
     * in hue, saturation, and luminosity, from the base and from each other.
     * How much they differ depends on the *_RADIUS params.
     * 0-th sister color is the base color itself. */
    export function getSisterColor(base: Color, i: number, params: typeof DEFAULT_SISTER_COLOR_PARAMS = DEFAULT_SISTER_COLOR_PARAMS) {
        const [hue0, sat0, lum0] = PslColors.colorToPsl(base);
        const hue = remap(magicNumber2(i), hue0, params.hueRadius);
        const sat = remap(magicNumber3(i), sat0, params.satRadius, params.satMin, params.satMax);
        const lum = remap((1 - magicNumber(i)) % 1, lum0, params.lumRadius, params.lumMin, params.lumMax);
        return PslColors.pslToColor(PslColors.PSL(hue, sat, lum));
    }

    /** Get i-th "sister color" for the given base color.
     * The sister colors are similar to the base color but slightly differ
     * in hue, chroma, and luminosity, from the base and from each other.
     * How much they differ depends on the *_RADIUS params.
     * 0-th sister color is the base color itself. */
    export function getSisterColorHcl(base: Color, i: number, params: typeof DEFAULT_SISTER_COLOR_PARAMS = DEFAULT_SISTER_COLOR_PARAMS) {
        const [hue0, sat0, lum0] = Hcl.fromColor(Hcl(), base);
        const hue = remap(magicNumber2(i), hue0, params.hueRadius);
        const sat = remap(magicNumber3(i), sat0, params.satRadius * 100, params.satMin * 100, params.satMax * 100);
        const lum = remap(magicNumber(i), lum0, params.lumRadius * 100, params.lumMin * 100, params.lumMax * 100);
        return Hcl.toColor(Hcl.create(hue, sat, lum));
    }

    /** Map values from [0, 1) to [center-radius, center+radius) so that
     * 0 maps to center, [0, 0.5) map to [center, center+radius), [0.5, 1) map to [center-radius, center).
     * If min and/or max are given, shift the codomain to fully fit in [min, max), but 0 must still map to center. */
    function remap(value: number, center: number, radius: number, min?: number, max?: number) {
        let start = center - radius;
        const range = (min !== undefined && max !== undefined) ? Math.min(2 * radius, max - min) : 2 * radius;
        if (min !== undefined) {
            start = Math.max(start, min);
            center = Math.max(center, min);
        }
        if (max !== undefined) {
            start = Math.min(start, max - range);
            center = Math.min(center, max - 0.001 * range);
        }

        const valueShift = (range > 0) ? (center - start) / range : 0;
        return start + ((value + valueShift) % 1) * range;
    }

    /** Golden ratio */
    const PHI = (1 + Math.sqrt(5)) / 2;
    const PHI2 = PHI / 5 ** (1 / 5);
    const PHI3 = PHI / 5 ** (4 / 5);

    /** This has a nice property that the first N magic numbers are close to equidistinantly distributed in [0, 1), for any N. */
    function magicNumber(i: number) {
        return (i * PHI) % 1;
    }

    /** This has a nice property (maybe just coincidence) that the first N points with
     * coordinates [magicNumber(i), magicNumber2(i)] are nicely distributed in unit square, for any N.
     * (There will be some patterns but they seem to fold between themselves as N grow.
     * Far from the beauty of magicNumber alone but should suffice.) */
    function magicNumber2(i: number) {
        return (i * PHI2) % 1;
    }

    /** This has a nice property (maybe just coincidence) that the first N points with
     * coordinates [magicNumber(i), magicNumber3(i)] are nicely distributed in unit square, for any N.
     * (There will be some patterns but they seem to fold between themselves as N grow.
     * Far from the beauty of magicNumber alone but should suffice.) */
    function magicNumber3(i: number) {
        return (i * PHI3) % 1;
    }
}

