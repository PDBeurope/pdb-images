/**
 * Copyright (c) 2023 EMBL - European Bioinformatics Institute, licensed under Apache 2.0, see LICENSE file for more info.
 *
 * @author Adam Midlik <midlik@gmail.com>
 */

import { Camera } from 'molstar/lib/commonjs/mol-canvas3d/camera';
import { Mat3, Vec3 } from 'molstar/lib/commonjs/mol-math/linear-algebra';
import { ROTATION_MATRICES } from 'molstar/lib/commonjs/mol-plugin-state/manager/focus-camera/orient-axes';

import { getTestingPlugin } from '../../_spec/_utils';
import { adjustCamera, changeCameraRotation, changeCameraZoom, combineRotations, zoomAll } from '../camera';


describe('camera', () => {
    it('combineRotations', () => {
        const m1 = Mat3.create(
            -0.9876392410979242, 0.035263885551574184, 0.15272584669447498,
            0.1378454406839028, -0.2684194501859321, 0.953388519120779,
            0.07461477016098815, 0.9626564585238534, 0.26024055671655744);
        const m2 = Mat3.create(
            1, 0, 0,
            0, 0, 1,
            0, -1, 0);

        const result11 = Mat3.create(
            0.9916878403493178, 0.10272901276846629, -0.07747239633213146,
            -0.10200509859654762, 0.9946955824963117, 0.013254898508608365,
            0.07842311810190494, -0.005242257906457992, 0.9969063667230046);
        const result12 = Mat3.create(
            -0.9876392410979242, -0.15272584669447498, 0.035263885551574184,
            0.1378454406839028, -0.953388519120779, -0.2684194501859321,
            0.07461477016098815, -0.26024055671655744, 0.9626564585238534);
        const result21 = Mat3.create(
            -0.9876392410979242, 0.035263885551574184, 0.15272584669447498,
            0.07461477016098815, 0.9626564585238534, 0.26024055671655744,
            -0.1378454406839028, 0.2684194501859321, -0.953388519120779);
        const result22 = Mat3.create(
            1, 0, 0,
            0, -1, 0,
            0, 0, -1);
        const result2222 = Mat3.identity();

        expect(matrixSqDiff(combineRotations(), Mat3.identity())).toBeCloseTo(0);
        expect(matrixSqDiff(combineRotations(m1), m1)).toBeCloseTo(0);
        expect(matrixSqDiff(combineRotations(m1, m1), result11)).toBeCloseTo(0);
        expect(matrixSqDiff(combineRotations(m1, m2), result12)).toBeCloseTo(0);
        expect(matrixSqDiff(combineRotations(m2, m1), result21)).toBeCloseTo(0);
        expect(matrixSqDiff(combineRotations(m2, m2), result22)).toBeCloseTo(0);
        expect(matrixSqDiff(combineRotations(m2, m2, m2, m2), result2222)).toBeCloseTo(0);
    });

    it('changeCameraZoom', () => {
        const oldSnapshot: Camera.Snapshot = {
            ...Camera.createDefaultSnapshot(),
            target: Vec3.create(1, 1, 1),
            position: Vec3.create(11, 5, -1),
        };
        const zoomedSame: Camera.Snapshot = { ...oldSnapshot, minNear: 0 };
        const zoomedIn: Camera.Snapshot = { ...oldSnapshot, position: Vec3.create(6, 3, 0), minNear: 0 };
        const zoomedOut: Camera.Snapshot = { ...oldSnapshot, position: Vec3.create(31, 13, -5), minNear: 0 };
        expect(changeCameraZoom(oldSnapshot, 1)).toEqual(zoomedSame);
        expect(changeCameraZoom(oldSnapshot, 0.5)).toEqual(zoomedIn);
        expect(changeCameraZoom(oldSnapshot, 3)).toEqual(zoomedOut);
    });

    it('changeCameraRotation', () => {
        const oldSnapshot: Camera.Snapshot = {
            ...Camera.createDefaultSnapshot(),
            target: Vec3.create(1, 1, 1),
            position: Vec3.create(1, 1, 11),
            up: Vec3.create(0, 1, 0),
        };
        const fromRight: Camera.Snapshot = { ...oldSnapshot, position: Vec3.create(11, 1, 1) };
        const fromLeft: Camera.Snapshot = { ...oldSnapshot, position: Vec3.create(-9, 1, 1) };
        const fromTop: Camera.Snapshot = { ...oldSnapshot, position: Vec3.create(1, 11, 1), up: Vec3.create(0, 0, -1) };
        const fromBottom: Camera.Snapshot = { ...oldSnapshot, position: Vec3.create(1, -9, 1), up: Vec3.create(0, 0, 1) };
        const rolledRight: Camera.Snapshot = { ...oldSnapshot, position: Vec3.create(1, 1, 11), up: Vec3.create(1, 0, 0) };
        const rolledLeft: Camera.Snapshot = { ...oldSnapshot, position: Vec3.create(1, 1, 11), up: Vec3.create(-1, 0, 0) };
        const rolledUpsideDown: Camera.Snapshot = { ...oldSnapshot, position: Vec3.create(1, 1, 11), up: Vec3.create(0, -1, 0) };

        expect(changeCameraRotation(oldSnapshot, Mat3.identity())).toEqual(oldSnapshot);
        expect(changeCameraRotation(oldSnapshot, ROTATION_MATRICES.rotY90)).toEqual(fromLeft);
        expect(changeCameraRotation(oldSnapshot, ROTATION_MATRICES.rotY270)).toEqual(fromRight);
        expect(changeCameraRotation(oldSnapshot, ROTATION_MATRICES.rotX90)).toEqual(fromTop);
        expect(changeCameraRotation(oldSnapshot, ROTATION_MATRICES.rotX270)).toEqual(fromBottom);
        expect(changeCameraRotation(oldSnapshot, ROTATION_MATRICES.rotZ90)).toEqual(rolledRight);
        expect(changeCameraRotation(oldSnapshot, ROTATION_MATRICES.rotZ270)).toEqual(rolledLeft);
        expect(changeCameraRotation(oldSnapshot, ROTATION_MATRICES.rotZ180)).toEqual(rolledUpsideDown);
    });

    it('adjustCamera', async () => {
        const plugin = await getTestingPlugin();
        try {
            const oldSnapshot = plugin.canvas3d?.camera.getSnapshot();
            adjustCamera(plugin, () => ({ ...Camera.createDefaultSnapshot(), position: Vec3.create(11, 1, 1) }));
            const newSnapshot = plugin.canvas3d?.camera.getSnapshot();
            expect(newSnapshot).not.toEqual(oldSnapshot);
        } finally {
            plugin?.dispose();
        }
    });

    it('zoomAll', async () => {
        const plugin = await getTestingPlugin();
        try {
            const oldSnapshot = plugin.canvas3d?.camera.getSnapshot();
            zoomAll(plugin, 1.5);
            const newSnapshot = plugin.canvas3d?.camera.getSnapshot();
            expect(newSnapshot).not.toEqual(oldSnapshot);
            if (oldSnapshot && newSnapshot) {
                const oldDistance = Vec3.magnitude(Vec3.sub(Vec3(), oldSnapshot.target, oldSnapshot.position));
                const newDistance = Vec3.magnitude(Vec3.sub(Vec3(), newSnapshot.target, newSnapshot.position));
                expect(newDistance).toBeCloseTo(1.5 * oldDistance);
            }
        } finally {
            plugin?.dispose();
        }
    });
});


/** Sum of square differences between 2 matrices. */
function matrixSqDiff(real: Mat3, expected: Mat3): number {
    const sqDiff = Mat3.sub(Mat3(), real, expected).map(x => x ** 2).reduce((a, b) => a + b);
    if (sqDiff > 0.001) {
        console.warn('Matrices do not match!\nExpected:', expected, '\nGot:', real);
    }
    return sqDiff;
}
