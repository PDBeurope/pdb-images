import { Mat3, Vec3 } from 'molstar/lib/commonjs/mol-math/linear-algebra';
import { PrincipalAxes } from 'molstar/lib/commonjs/mol-math/linear-algebra/matrix/principal-axes';
import { Model, Structure } from 'molstar/lib/commonjs/mol-model/structure';
import { round } from 'molstar/lib/commonjs/mol-util';

import { warn } from './helpers/helpers';


const MIN_ATOMS_FOR_PCA = 3;

type Coords = {
    x: ArrayLike<number>,
    y: ArrayLike<number>,
    z: ArrayLike<number>
}

export const ROTATION_MATRICES = {
    // The order of elements in the matrices in column-wise (F-style)
    eye: Mat3.create(1, 0, 0, 0, 1, 0, 0, 0, 1),
    rotX90: Mat3.create(1, 0, 0, 0, 0, 1, 0, -1, 0),
    rotY90: Mat3.create(0, 0, -1, 0, 1, 0, 1, 0, 0),
    rotZ90: Mat3.create(0, 1, 0, -1, 0, 0, 0, 0, 1),
    rotX270: Mat3.create(1, 0, 0, 0, 0, -1, 0, 1, 0),
    rotY270: Mat3.create(0, 0, 1, 0, 1, 0, -1, 0, 0),
    rotZ270: Mat3.create(0, -1, 0, 1, 0, 0, 0, 0, 1),
    rotX180: Mat3.create(1, 0, 0, 0, -1, 0, 0, 0, -1),
    rotY180: Mat3.create(-1, 0, 0, 0, 1, 0, 0, 0, -1),
    rotZ180: Mat3.create(-1, 0, 0, 0, -1, 0, 0, 0, 1),
};


export function modelLayingRotation(model: Model, referenceRotation?: Mat3): Mat3 {
    const coords = {
        x: model.atomicConformation.x,
        y: model.atomicConformation.y,
        z: model.atomicConformation.z,
    };
    const atomElements = model.atomicHierarchy.atoms.type_symbol.toArray() as any as string[];
    const heavyIndices = indicesNotWith(atomElements, 'H');
    const heavyCoords = coordsAt(coords, heavyIndices);
    if (heavyCoords.x.length < 3) {
        return Mat3.identity();
    }
    const flatCoords = flattenCoords(heavyCoords);
    return layingRotation(flatCoords, referenceRotation);
}

export function structureLayingRotation(structure: Structure, referenceRotation?: Mat3): Mat3 {
    const flatCoords = selectMainCoords(structure, MIN_ATOMS_FOR_PCA);
    return layingRotation(flatCoords, referenceRotation);
}

function layingRotation(flatCoords: number[], referenceRotation?: Mat3): Mat3 {
    if (flatCoords.length === 0) {
        warn('Skipping PCA, no atoms');
        return Mat3.identity();
    }
    const axes = PrincipalAxes.calculateMomentsAxes(flatCoords);
    const normAxes = PrincipalAxes.calculateNormalizedAxes(axes);
    const R = mat3FromRows(normAxes.dirA, normAxes.dirB, normAxes.dirC);
    avoidMirrorRotation(R); // The SVD implementation seems to always provide proper rotation, but just to be sure
    const flip = referenceRotation ? minimalFlip(R, referenceRotation) : canonicalFlip(flatCoords, R, axes.origin);
    Mat3.mul(R, flip, R);
    // const checkFlip = canonicalFlip(flatCoords, R, axes.origin); // debug, TODO remove this, move it to tests
    // if (!Mat3.areEqual(checkFlip, Mat3.identity(), 1e-12)) throw new Error('Needed flip after flipping is not identity');
    return R;
}

/** Try these selection strategies until having at least `minAtoms` atoms:
 * 1. only "polymer" atoms (e.g. C-alpha and O3')
 * 2. all non-hydrogen atoms with exception of water (HOH)
 * 3. all atoms
 * Return the coordinates in a flattened array (in triples).
 * If the total number of atoms is less than `minAtoms`, return only those. */
function selectMainCoords(struct: Structure, minAtoms: number): number[] {
    let coords = selectCACoords(struct);
    if (coords.length >= 3 * minAtoms) return coords;

    coords = selectHeavyCoords(struct);
    if (coords.length >= 3 * minAtoms) return coords;

    coords = selectAllCoords(struct);
    return coords;
}

/** Select coordinates of C-alpha and O3' atoms */
function selectCACoords(struct: Structure): number[] {
    const coords: number[] = [];
    for (const unit of struct.units) {
        const { x, y, z } = unit.conformation;
        for (let i = 0; i < unit.polymerElements.length; i++) {
            const index = unit.polymerElements[i];
            coords.push(x(index), y(index), z(index));
        }
    }
    return coords;
}
/** Select coordinates of non-hydrogen atoms, excluding water */
function selectHeavyCoords(struct: Structure): number[] {
    const coords: number[] = [];
    for (const unit of struct.units) {
        const { x, y, z } = unit.model.atomicConformation;
        for (let i = 0; i < unit.elements.length; i++) {
            const index = unit.elements[i];
            const compound = unit.model.atomicHierarchy.atoms.label_comp_id.value(index);
            const element = unit.model.atomicHierarchy.atoms.type_symbol.value(index);
            if (element !== 'H' && compound !== 'HOH') {
                coords.push(x[index], y[index], z[index]);
            }
        }
    }
    return coords;
}
/** Select coordinates of all atoms */
function selectAllCoords(struct: Structure): number[] {
    const coords: number[] = [];
    for (const unit of struct.units) {
        const { x, y, z } = unit.model.atomicConformation;
        for (let i = 0; i < unit.elements.length; i++) {
            const index = unit.elements[i];
            coords.push(x[index], y[index], z[index]);
        }
    }
    return coords;
}

function logCoords(coords: number[]) {
    for (let i = 0; i < coords.length; i += 3) {
        console.log(round(coords[i], 3), round(coords[i + 1], 3), round(coords[i + 2], 3));
    }
}

function logStructureInfo(structure: Structure) {
    console.log('structure', structure.label);
    for (const unit of structure.units) {
        console.log('unit', unit.id);
        console.log(unit.elements);
        console.log(unit.polymerElements);
        for (let i = 0; i < unit.elements.length; i++) {
            const index = unit.elements[i];
            const atomName = unit.model.atomicHierarchy.atoms.label_atom_id.value(index);
            const resn = unit.model.atomicHierarchy.atoms.label_comp_id.value(index);
            const symbol = unit.model.atomicHierarchy.atoms.type_symbol.value(index);
            console.log('    atom', index, atomName, resn, symbol);
        }
    }
}


function minimalFlip(rotation: Mat3, referenceRotation: Mat3): Mat3 {
    let bestFlip = ROTATION_MATRICES.eye;
    let bestScore = 0; // there will always be at least one positive score
    const aux = Mat3();
    for (const flip of [ROTATION_MATRICES.eye, ROTATION_MATRICES.rotX180, ROTATION_MATRICES.rotY180, ROTATION_MATRICES.rotZ180]) {
        const score = mat3Dot(Mat3.mul(aux, flip, rotation), referenceRotation);
        if (score > bestScore) {
            bestFlip = flip;
            bestScore = score;
        }
    }
    return bestFlip;
}

/** Measure of how similar two rotation matrices are (dot product of flattened matrices) */
function mat3Dot(a: Mat3, b: Mat3) {
    return a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3] + a[4] * b[4] + a[5] * b[5] + a[6] * b[6] + a[7] * b[7] + a[8] * b[8];
}


/** Return a rotation matrix that should be applied to coords (after being rotated by `rotation`) to ensure a deterministic "canonical" rotation.
 *  One of 4 possible results is selected so that:
 *    1) starting and ending coordinates tend to be more in front (z > 0), middle more behind (z < 0).
 *    2) starting coordinates tend to be more left-top (x < y), ending more right-bottom (x > y).
 *  Provided `origin` parameter MUST be the mean of the coords, otherwise it will not work!
 */
function canonicalFlip(flatCoords: number[], rotation: Mat3 = Mat3.identity(), origin: Vec3 = Vec3.zero()): Mat3 {
    const pcaX = Vec3.create(Mat3.getValue(rotation, 0, 0), Mat3.getValue(rotation, 0, 1), Mat3.getValue(rotation, 0, 2));
    const pcaY = Vec3.create(Mat3.getValue(rotation, 1, 0), Mat3.getValue(rotation, 1, 1), Mat3.getValue(rotation, 1, 2));
    const pcaZ = Vec3.create(Mat3.getValue(rotation, 2, 0), Mat3.getValue(rotation, 2, 1), Mat3.getValue(rotation, 2, 2));
    const n = Math.floor(flatCoords.length / 3);
    const v = Vec3();
    let xCum = 0;
    let yCum = 0;
    let zCum = 0;
    for (let i = 0; i < n; i++) {
        Vec3.fromArray(v, flatCoords, 3 * i);
        Vec3.sub(v, v, origin);
        xCum += i * Vec3.dot(v, pcaX);
        yCum += i * Vec3.dot(v, pcaY);
        zCum += veeSlope(i, n) * Vec3.dot(v, pcaZ);
    }
    const wrongFrontBack = zCum < 0;
    const wrongLeftTopRightBottom = wrongFrontBack ? xCum + yCum < 0 : xCum - yCum < 0;
    if (wrongLeftTopRightBottom && wrongFrontBack) {
        return ROTATION_MATRICES.rotY180; // flip around Y = around X then Z
    } else if (wrongFrontBack) {
        return ROTATION_MATRICES.rotX180;
    } else if (wrongLeftTopRightBottom) {
        return ROTATION_MATRICES.rotZ180;
    } else {
        return Mat3.identity();
    }
}

function veeSlope(i: number, n: number) {
    const mid = Math.floor(n / 2);
    if (i < mid) {
        if (n % 2) return mid - i;
        else return mid - i - 1;
    } else {
        return i - mid;
    }
}

function mat3FromRows(row0: Vec3, row1: Vec3, row2: Vec3): Mat3 {
    const m = Mat3();
    Mat3.setValue(m, 0, 0, row0[0]);
    Mat3.setValue(m, 0, 1, row0[1]);
    Mat3.setValue(m, 0, 2, row0[2]);
    Mat3.setValue(m, 1, 0, row1[0]);
    Mat3.setValue(m, 1, 1, row1[1]);
    Mat3.setValue(m, 1, 2, row1[2]);
    Mat3.setValue(m, 2, 0, row2[0]);
    Mat3.setValue(m, 2, 1, row2[1]);
    Mat3.setValue(m, 2, 2, row2[2]);
    return m;
}

/** Check if a rotation matrix includes mirroring and invert Z axis in such case, to ensure a proper rotation (in-place). */
function avoidMirrorRotation(rot: Mat3) {
    if (Mat3.determinant(rot) < 0) {
        Mat3.setValue(rot, 2, 0, -Mat3.getValue(rot, 2, 0));
        Mat3.setValue(rot, 2, 1, -Mat3.getValue(rot, 2, 1));
        Mat3.setValue(rot, 2, 2, -Mat3.getValue(rot, 2, 2));
    }
}

function logMatrix(R: Mat3) {
    console.log(Mat3.getValue(R, 0, 0), Mat3.getValue(R, 0, 1), Mat3.getValue(R, 0, 2));
    console.log(Mat3.getValue(R, 1, 0), Mat3.getValue(R, 1, 1), Mat3.getValue(R, 1, 2));
    console.log(Mat3.getValue(R, 2, 0), Mat3.getValue(R, 2, 1), Mat3.getValue(R, 2, 2));
}

function indicesWith<T>(array: ArrayLike<T>, value: T): number[] {
    const indices = [];
    for (let i = 0; i < array.length; i++) {
        if (array[i] === value) {
            indices.push(i);
        }
    }
    return indices;
}
function indicesNotWith<T>(array: ArrayLike<T>, value: T): number[] {
    const indices = [];
    for (let i = 0; i < array.length; i++) {
        if (array[i] !== value) {
            indices.push(i);
        }
    }
    return indices;
}

function coordsAt(coords: Coords, indices: number[]): Coords {
    return {
        x: indices.map(i => coords.x[i]),
        y: indices.map(i => coords.y[i]),
        z: indices.map(i => coords.z[i]),
    };
}

function flattenCoords(coords: Coords): number[] {
    const flat = [];
    for (let i = 0; i < coords.x.length; i++) {
        flat.push(coords.x[i], coords.y[i], coords.z[i]);
    }
    return flat;
}
