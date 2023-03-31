import { State } from 'molstar/lib/mol-state';


const REF_INIT = '!';
const REF_SEP = '/';

/** Check if desiredRef is already in the state tree and provide an alternative if so (e.g. 'blabla' -> 'blabla(1)') */
export function uniqueRef(state: State, desiredRef: string | undefined): string | undefined {
    if (!desiredRef) return desiredRef;
    let ref = desiredRef;
    let counter = 0;
    while (state.cells.has(ref)) {
        ref = `${desiredRef}(${++counter})`;
    }
    return ref;
}

export function baseRef(name?: string): string | undefined {
    if (!name) return undefined; // use automatic ref assignment
    return REF_INIT + name;
}

export function childRef(parentRef: string | undefined, suffix: string, replaceOldSuffix?: boolean): string | undefined {
    if (!parentRef || !parentRef.startsWith(REF_INIT)) return undefined; // use automatic ref assignment
    if (replaceOldSuffix) {
        const oldSuffixPosition = parentRef.lastIndexOf(REF_SEP);
        if (oldSuffixPosition > 0) { // if oldSuffixPosition===0, it is not REF_SEP but REF_INIT
            parentRef = parentRef.substring(0, oldSuffixPosition);
        }
    }
    return parentRef + REF_SEP + suffix;
}
