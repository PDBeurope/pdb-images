/**
 * Copyright (c) 2023 EMBL - European Bioinformatics Institute, licensed under Apache 2.0, see LICENSE file for more info.
 *
 * @author Adam Midlik <midlik@gmail.com>
 */

import { MolScriptBuilder } from 'molstar/lib/commonjs/mol-script/language/builder';
import { Expression } from 'molstar/lib/commonjs/mol-script/language/expression';


export type SubstructureDef = SubstructureDef.Domain | SubstructureDef.Sets

export namespace SubstructureDef {
    export interface Domain {
        kind: 'domain',
        chainId: string,
        ranges: [number, number][],
        label?: string
    }
    export namespace Domain {
        export function create(chainId: string, ranges: [number, number][], label?: string): Domain {
            return { kind: 'domain', chainId, ranges, label };
        }
        export function expression(def: Domain): Expression {
            const rangeSubexprs = def.ranges.map(r => MolScriptBuilder.core.rel.inRange([MolScriptBuilder.struct.atomProperty.macromolecular.label_seq_id(), r[0], r[1]]));
            return MolScriptBuilder.struct.generator.atomGroups({
                'chain-test': MolScriptBuilder.core.rel.eq([MolScriptBuilder.struct.atomProperty.macromolecular.label_asym_id(), def.chainId]),
                'residue-test': MolScriptBuilder.core.logic.or(rangeSubexprs)
            });
        }
    }

    export interface Sets {
        kind: 'sets',
        sets: { [chainId: string]: number[] },
        label?: string
    }
    export namespace Sets {
        export function create(sets: { [chainId: string]: number[] }, label?: string): Sets {
            return { kind: 'sets', sets, label };
        }
        export function expression(def: Sets): Expression {
            const subexprs = [];
            for (const chainId in def.sets) {
                subexprs.push(
                    MolScriptBuilder.core.logic.and([
                        MolScriptBuilder.core.rel.eq([MolScriptBuilder.struct.atomProperty.macromolecular.label_asym_id(), chainId]),
                        MolScriptBuilder.core.logic.or(
                            def.sets[chainId].map(r => MolScriptBuilder.core.rel.eq([MolScriptBuilder.struct.atomProperty.macromolecular.label_seq_id(), r]))
                        )
                    ])
                );
            }
            return MolScriptBuilder.struct.generator.atomGroups({
                'residue-test': MolScriptBuilder.core.logic.or(subexprs),
            });
        }
    }

    export function expression(def: SubstructureDef): Expression {
        switch (def.kind) {
            case 'domain': return Domain.expression(def);
            case 'sets': return Sets.expression(def);
        }
    }
}
