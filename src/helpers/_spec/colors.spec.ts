import { assignEntityAndUnitColors, cycleIterator } from '../colors';
import { getTestingStructure } from '../../_spec/_utils';


describe('colors', () => {
    it('cycleIterator', () => {
        const iterator = cycleIterator([1, 10, 42]);
        expect(iterator.next().value).toEqual(1);
        expect(iterator.next().value).toEqual(10);
        expect(iterator.next().value).toEqual(42);
        expect(iterator.next().value).toEqual(1);
        expect(iterator.next().value).toEqual(10);
        expect(iterator.next().value).toEqual(42);
        expect(iterator.next().value).toEqual(1);
    });

    it('assignEntityAndUnitColors - correct number of colors', async () => {
        // 1hda: 2 * alpha subunit, 2 * beta subunit, 4 * HEM, 1 * water
        const structure = await getTestingStructure('1hda');
        const result = assignEntityAndUnitColors(structure);
        expect(result.entities.length).toBe(4);
        expect(result.units.length).toBe(9);
        return;
    });
    it('assignEntityAndUnitColors - distinct colors', async () => {
        // 1hda: 2 * alpha subunit, 2 * beta subunit, 4 * HEM, 1 * water
        const structure = await getTestingStructure('1hda');
        const result = assignEntityAndUnitColors(structure);
        expect(new Set(result.entities).size).toBe(4);
        expect(new Set(result.units).size).toBe(9);
        return;
    });
    it('assignEntityAndUnitColors - first chain matches entity color', async () => {
        // 1hda: 2 * alpha subunit, 2 * beta subunit, 4 * HEM, 1 * water
        const structure = await getTestingStructure('1hda');
        const result = assignEntityAndUnitColors(structure);
        expect(result.units[0] === result.entities[0]); // first alpha subunit
        expect(result.units[2] === result.entities[1]); // first beta subunit
        expect(result.units[4] === result.entities[2]); // first HEM
        expect(result.units[8] === result.entities[3]); // water
        return;
    });
});
