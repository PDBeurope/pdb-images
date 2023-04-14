import { Camera } from 'molstar/lib/commonjs/mol-canvas3d/camera';
import { Mat3, Vec3 } from 'molstar/lib/commonjs/mol-math/linear-algebra';
import { PluginContext } from 'molstar/lib/commonjs/mol-plugin/context';

import { getLogger, oneLine } from './logging';


const logger = getLogger(module);

const ZOOMOUT = 0.75;


/** Combine multiple rotation matrices in the order as they are applied. */
export function combineRotations(...matrices: Mat3[]) {
    // First applied rotation is the rightmost in the product
    const result = Mat3.identity();
    for (const mat of matrices) {
        Mat3.mul(result, mat, result);
    }
    return result;
}

/** Return a new camera snapshot with the same target and orientation as `old`
 * but with the camera position relatively nearer (if `zoomout < 1`)
 * or farther (if `zoomout > 1`) from the camera target. */
export function changeCameraZoom(old: Camera.Snapshot, zoomout: number): Camera.Snapshot {
    let relPosition = Vec3.sub(Vec3(), old.position, old.target);
    relPosition = Vec3.scale(relPosition, relPosition, zoomout);
    const newPosition = Vec3.add(Vec3(), old.target, relPosition);
    return { ...old, position: newPosition };
}

/** Return a new camera snapshot with the same target and camera distance from the target as `old`
 * but with diferent orientation.
 * The actual rotation applied to the camera is the invert of `rotation`,
 * which creates the same effect as if `rotation` were applied to the whole scene without moving the camera.
 * The rotation is relative to the default camera orientation (not to the current orientation). */
export function changeCameraRotation(old: Camera.Snapshot, rotation: Mat3): Camera.Snapshot {
    const cameraRotation = Mat3.invert(Mat3(), rotation);
    const dist = Vec3.distance(old.position, old.target);
    const relPosition = Vec3.transformMat3(Vec3(), Vec3.create(0, 0, dist), cameraRotation);
    const newUp = Vec3.transformMat3(Vec3(), Vec3.create(0, 1, 0), cameraRotation);
    const newPosition = Vec3.add(Vec3(), old.target, relPosition);
    return { ...old, position: newPosition, up: newUp };
}

/** Apply `change` to the camera snapshot (i.e. target, position, orientation) in a plugin.
 * The `change` function will get the current camera snapshot and the result of the function will be used as the new snapshot. */
export function adjustCamera(plugin: PluginContext, change: (old: Camera.Snapshot) => Camera.Snapshot) {
    if (!plugin.canvas3d) throw new Error('plugin.canvas3d is undefined');
    plugin.canvas3d.commit(true);
    const oldSnapshot = plugin.canvas3d.camera.getSnapshot();
    const newSnapshot = change(oldSnapshot);
    plugin.canvas3d.camera.setState(newSnapshot);
    const checkSnapshot = plugin.canvas3d.camera.getSnapshot();
    if (oldSnapshot.radius > 0 && !Camera.areSnapshotsEqual(newSnapshot, checkSnapshot)) {
        logger.error('The camera has not been adjusted correctly.');
        logger.error('Required:', oneLine(newSnapshot));
        logger.error('Real:', oneLine(checkSnapshot));
        throw new Error(`AssertionError: The camera has not been adjusted correctly.`);
    }
}

/** Zoom the camera to the whole visible scene, without changing orientation.
 * Then move the camera slightly nearer to (if `zoomout < 1`) or away from (if `zoomout > 1`) the target.
 * The default value of `zoomout` was selected so that the scene still fits to the viewport,
 * but is not too small in the middle. */
export function zoomAll(plugin: PluginContext, zoomout: number = ZOOMOUT) {
    plugin.managers.camera.reset(); // needed when camera.manualReset=true in canvas3D props
    adjustCamera(plugin, s => changeCameraZoom(s, zoomout));
}
