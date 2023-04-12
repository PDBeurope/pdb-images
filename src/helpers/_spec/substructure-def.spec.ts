import { formatMolScript } from 'molstar/lib/commonjs/mol-script/language/expression-formatter';

import { SubstructureDef } from '../substructure-def';


describe('SubstructureDef.Domain', () => {
    it('create', async () => {
        expect(SubstructureDef.Domain.create('A', []))
            .toEqual({ chainId: 'A', kind: 'domain', label: undefined, ranges: [] });
        expect(SubstructureDef.Domain.create('A', [], 'Blabla'))
            .toEqual({ chainId: 'A', kind: 'domain', label: 'Blabla', ranges: [] });
        expect(SubstructureDef.Domain.create('B', [[1, 100], [123, 169], [200, 300]]))
            .toEqual({ chainId: 'B', kind: 'domain', label: undefined, ranges: [[1, 100], [123, 169], [200, 300]] });
    });

    it('expression', async () => {
        const def = SubstructureDef.Domain.create('B', [[1, 100], [123, 169], [200, 300]]);
        const expr = SubstructureDef.Domain.expression(def);
        expect(formatMolScript(expr).replace(/\s+/g, ' '))
            .toEqual('(structure-query.generator.atom-groups :chain-test (core.rel.eq (structure-query.atom-property.macromolecular.label_asym_id) B) :residue-test (core.logic.or (core.rel.in-range (structure-query.atom-property.macromolecular.label_seq_id) 1 100) (core.rel.in-range (structure-query.atom-property.macromolecular.label_seq_id) 123 169) (core.rel.in-range (structure-query.atom-property.macromolecular.label_seq_id) 200 300)))');
    });
});

describe('SubstructureDef.Sets', () => {
    it('create', async () => {
        expect(SubstructureDef.Sets.create({}))
            .toEqual({ kind: 'sets', label: undefined, sets: {} });
        expect(SubstructureDef.Sets.create({}, 'Blabla'))
            .toEqual({ kind: 'sets', label: 'Blabla', sets: {} });
        expect(SubstructureDef.Sets.create({ 'A': [1, 10, 100], 'B': [5], 'C': [666, 667] }))
            .toEqual({ kind: 'sets', label: undefined, sets: { 'A': [1, 10, 100], 'B': [5], 'C': [666, 667] } });
    });

    it('expression', async () => {
        const def = SubstructureDef.Sets.create({ 'A': [1, 10, 100], 'B': [5], 'C': [666, 667] });
        const expr = SubstructureDef.Sets.expression(def);
        expect(formatMolScript(expr).replace(/\s+/g, ' '))
            .toEqual('(structure-query.generator.atom-groups :residue-test (core.logic.or (core.logic.and (core.rel.eq (structure-query.atom-property.macromolecular.label_asym_id) A) (core.logic.or (core.rel.eq (structure-query.atom-property.macromolecular.label_seq_id) 1) (core.rel.eq (structure-query.atom-property.macromolecular.label_seq_id) 10) (core.rel.eq (structure-query.atom-property.macromolecular.label_seq_id) 100))) (core.logic.and (core.rel.eq (structure-query.atom-property.macromolecular.label_asym_id) B) (core.logic.or (core.rel.eq (structure-query.atom-property.macromolecular.label_seq_id) 5))) (core.logic.and (core.rel.eq (structure-query.atom-property.macromolecular.label_asym_id) C) (core.logic.or (core.rel.eq (structure-query.atom-property.macromolecular.label_seq_id) 666) (core.rel.eq (structure-query.atom-property.macromolecular.label_seq_id) 667)))))');
    });
});
