import { Camera } from 'molstar/lib/mol-canvas3d/camera';
import { Mat3, Vec3 } from 'molstar/lib/mol-math/linear-algebra';
import { PluginContext } from 'molstar/lib/mol-plugin/context';

const ZOOMOUT = 0.75;


/** Combine multiple rotation matrices in the order as they are applied */
export function combineRotations(...matrices: Mat3[]) {
    // First applied rotation is the rightmost in the product
    const result = Mat3.identity();
    for (const mat of matrices) {
        Mat3.mul(result, mat, result);
    }
    return result;
}

export function cameraZoom(old: Camera.Snapshot, zoomout: number): Camera.Snapshot {
    let relPosition = Vec3.sub(Vec3(), old.position, old.target);
    relPosition = Vec3.scale(relPosition, relPosition, zoomout);
    const newPosition = Vec3.add(Vec3(), old.target, relPosition);
    return { ...old, position: newPosition };
}

export function cameraSetRotation(old: Camera.Snapshot, rotation: Mat3): Camera.Snapshot {
    const cameraRotation = Mat3.invert(Mat3(), rotation);
    const dist = Vec3.distance(old.position, old.target);
    const relPosition = Vec3.transformMat3(Vec3(), Vec3.create(0, 0, dist), cameraRotation);
    const newUp = Vec3.transformMat3(Vec3(), Vec3.create(0, 1, 0), cameraRotation);
    const newPosition = Vec3.add(Vec3(), old.target, relPosition);
    return { ...old, position: newPosition, up: newUp };
}

export function adjustCamera(plugin: PluginContext, change: (s: Camera.Snapshot) => Camera.Snapshot) {
    if (!plugin.canvas3d) throw new Error('plugin.canvas3d is undefined');
    plugin.canvas3d.commit(true);
    const oldSnapshot = plugin.canvas3d.camera.getSnapshot();
    const newSnapshot = change(oldSnapshot);
    plugin.canvas3d.camera.setState(newSnapshot);
    const checkSnapshot = plugin.canvas3d.camera.getSnapshot();
    if (!Camera.areSnapshotsEqual(newSnapshot, checkSnapshot)) {
        console.error('Error: The camera has not been adjusted correctly.');
        console.error('Required:');
        console.error(newSnapshot);
        console.error('Real:');
        console.error(checkSnapshot);
        throw new Error(`AssertionError: The camera has not been adjusted correctly.`);
    }
}

export function zoomAll(plugin: PluginContext, zoomout: number = ZOOMOUT) {
    plugin.managers.camera.reset(); // needed when camera.manualReset=true in canvas3D props
    adjustCamera(plugin, s => cameraZoom(s, zoomout));
}
