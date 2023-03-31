import { RawImageData } from 'molstar/lib/commonjs/mol-plugin/util/headless-screenshot';
import { Color } from 'molstar/lib/commonjs/mol-util/color';

import { ViewType } from '../captions';


/** Constants defining the position, size, and shape of the axis indicator arrows */
const ARROW = {
    /** Offset from left edge, relative to image width */
    leftMargin: 0.04,
    /** Offset from bottom edge, relative to image width */
    bottomMargin: 0.04,
    /** Arrow length, relative to image width */
    length: 0.1,
    /** Length of arrow head, relative to total arrow length */
    headLengthRatio: 0.25,
    /** Thickness of arrow head, relative to total arrow length */
    headThicknessRatio: 0.25,
    /** Thickness of arrow tail, relative to total arrow length */
    tailThicknessRatio: 0.1,
};

/** Colors for axis indicators (arrows) for PCA1, PCA2, PCA3 */
const PCA_COLORS = [Color.fromHexString('0xDD3333'), Color.fromHexString('0x338833'), Color.fromHexString('0x3333EE')];

/** Draw axis indicators in the image (in-place) */
export function addAxisIndicators(img: RawImageData, view: ViewType): void {
    const length = ARROW.length * img.width; // total arrow length
    const wHead = 0.5 * ARROW.headThicknessRatio * length; // head half-thickness
    const wTail = 0.5 * ARROW.tailThicknessRatio * length; // tail half-thickness
    const x0 = img.width * ARROW.leftMargin;
    const y0 = img.height - img.width * ARROW.bottomMargin;
    if (view === 'front') {
        const x = x0 + wHead, y = y0 - wHead;
        addArrowHorizontal(img, [x, y], +length, PCA_COLORS[0]); // right
        addArrowVertical(img, [x, y], -length, PCA_COLORS[1]); // up
        addRectangle(img, { x1: x - wTail, x2: x + wTail, y1: y - wTail, y2: y + wTail }, PCA_COLORS[2]);
    } else if (view === 'side') {
        const x = x0 + length, y = y0 - wHead;
        addArrowHorizontal(img, [x, y], -length, PCA_COLORS[2]); // left
        addArrowVertical(img, [x, y], -length, PCA_COLORS[1]); // up
        addRectangle(img, { x1: x - wTail, x2: x + wTail, y1: y - wTail, y2: y + wTail }, PCA_COLORS[0]);
    } else if (view === 'top') {
        const x = x0 + wHead, y = y0 - length;
        addArrowHorizontal(img, [x, y], +length, PCA_COLORS[0]); // right
        addArrowVertical(img, [x, y], +length, PCA_COLORS[2]); // down
        addRectangle(img, { x1: x - wTail, x2: x + wTail, y1: y - wTail, y2: y + wTail }, PCA_COLORS[1]);
    }
}
/** Draw a right arrow starting at `origin` with length `length` (use negative `length` for a left arrow) */
function addArrowHorizontal(img: RawImageData, origin: Point, length: number, color: Color) {
    const lHead = ARROW.headLengthRatio * length; // tail length
    const wHead = 0.5 * ARROW.headThicknessRatio * length; // head half-thickness
    const lTail = length - lHead; // tail length
    const wTail = 0.5 * ARROW.tailThicknessRatio * length; // tail half-thickness
    const [x, y] = origin;
    addRectangle(img, { x1: x, x2: x + lTail, y1: y - wTail, y2: y + wTail }, color);
    addTriangle(img, [[x + lTail, y + wHead], [x + lTail, y - wHead], [x + lTail + lHead, y]], color);
}

/** Draw a down arrow starting at `origin` with length `length` (use negative `length` for an up arrow) */
function addArrowVertical(img: RawImageData, origin: Point, length: number, color: Color) {
    const lHead = ARROW.headLengthRatio * length; // tail length
    const wHead = 0.5 * ARROW.headThicknessRatio * length; // head half-thickness
    const lTail = length - lHead; // tail length
    const wTail = 0.5 * ARROW.tailThicknessRatio * length; // tail half-thickness
    const [x, y] = origin;
    addRectangle(img, { x1: x - wTail, x2: x + wTail, y1: y, y2: y + lTail }, color);
    addTriangle(img, [[x + wHead, y + lTail], [x - wHead, y + lTail], [x, y + lTail + lHead]], color);
}

/** Draw a rectangle with two opposite corners at [x1, y1] and [x2, y2] */
function addRectangle(img: RawImageData, rect: { x1: number, y1: number, x2: number, y2: number }, color: Color) {
    const { height, width, data } = img;
    const { x1, y1, x2, y2 } = rect;

    const xMin = Math.max(Math.floor(Math.min(x1, x2)), 0);
    const xMax = Math.min(Math.ceil(Math.max(x1, x2)), width - 1);
    const yMin = Math.max(Math.floor(Math.min(y1, y2)), 0);
    const yMax = Math.min(Math.ceil(Math.max(y1, y2)), height - 1);

    const [r, g, b] = Color.toRgb(color);
    const nChannels = Math.floor(data.length / (height * width));
    if (nChannels !== 4) throw new Error('AssertionError: this function is only for images with 4 channels');
    for (let i = yMin; i <= yMax; i++) { // row index
        for (let j = xMin; j <= xMax; j++) { // column index
            const offset = (i * width + j) * nChannels;
            data[offset] = r;
            data[offset + 1] = g;
            data[offset + 2] = b;
            data[offset + 3] = 255; // alpha
        }
    }
}

/** Draw a triangle with corners `triangle` */
function addTriangle(img: RawImageData, triangle: [Point, Point, Point], color: Color) {
    const { height, width, data } = img;

    let [A, B, C] = triangle;
    let u = diff(B, A);
    let v = diff(C, B);
    let w = diff(A, C);
    if (cross(u, v) < 0) { // ensure clockwise order of A, B, C
        [B, C] = [C, B];
        u = diff(B, A);
        v = diff(C, B);
        w = diff(A, C);
    }

    const xMin = Math.max(Math.floor(Math.min(A[0], B[0], C[0])), 0);
    const xMax = Math.min(Math.ceil(Math.max(A[0], B[0], C[0])), width - 1);
    const yMin = Math.max(Math.floor(Math.min(A[1], B[1], C[1])), 0);
    const yMax = Math.min(Math.ceil(Math.max(A[1], B[1], C[1])), height - 1);

    const [r, g, b] = Color.toRgb(color);
    const nChannels = Math.floor(data.length / (height * width));
    if (nChannels !== 4) throw new Error('AssertionError: this function is only for images with 4 channels');
    for (let i = yMin; i <= yMax; i++) { // row index
        for (let j = xMin; j <= xMax; j++) { // column index
            const P = [j, i] as Point;
            if (cross(u, diff(P, A)) >= 0 && cross(v, diff(P, B)) >= 0 && cross(w, diff(P, C)) >= 0) {
                const offset = (i * width + j) * nChannels;
                data[offset] = r;
                data[offset + 1] = g;
                data[offset + 2] = b;
                data[offset + 3] = 255; // alpha
            }
        }
    }
}

type Point = [number, number]
type Vector = [number, number]

/** Return the vector from point `A` to `B` (i.e. B minus A) */
function diff(B: Point, A: Point): Vector {
    return [B[0] - A[0], B[1] - A[1]];
}

/** Return the z-coordinate of the cross product of vectors `u` and `v` */
function cross(u: Vector, v: Vector): number {
    return u[0] * v[1] - u[1] * v[0];
}
