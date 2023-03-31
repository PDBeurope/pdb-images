/** These are some insanely-looking functions which reorganize/filter SIFTS domain to fit our weird requirements:
 * For each combination of source-family-entity we want the total number of domain instances
 * but then only select one chain and visualize its domains.
 * The visualization should be done chain by chain, so we can reuse the chain visual.
 */

import { DomainRecord } from '../api';


/** Reorganize domains from source-family to source-family-entity */
export function sortDomainsByEntity(domains: { [source: string]: { [family: string]: DomainRecord[] } }) {
    const result = {} as { [source: string]: { [family: string]: { [entityId: string]: DomainRecord[] } } };
    for (const [source, sourceDomains] of Object.entries(domains)) {
        for (const [family, familyDomains] of Object.entries(sourceDomains)) {
            for (const domain of familyDomains) {
                const entityId = domain.chunks[0].entity_id;
                (((result[source] ??= {})[family] ??= {})[entityId] ??= []).push(domain);
            }
        }
    }
    return result;
}

/** For each combination of source-family-entity, select only domains from one chain (the longest chain).
 */
export function selectBestChainForDomains(domains: { [source: string]: { [family: string]: { [entityId: string]: DomainRecord[] } } }, chainCoverages?: { [chainId: string]: number }) {
    const result = {} as { [source: string]: { [family: string]: { [entityId: string]: DomainRecord[] } } };
    for (const [source, sourceDomains] of Object.entries(domains)) {
        for (const [family, familyDomains] of Object.entries(sourceDomains)) {
            for (const [entityId, entityDomains] of Object.entries(familyDomains)) {
                const chainIds = entityDomains.map(dom => dom.chunks[0].asymID);
                const uniqueChainIds = Array.from(new Set(chainIds));
                let selectedChain = uniqueChainIds[0];
                if (chainCoverages) {
                    for (const other of uniqueChainIds) {
                        if (chainCoverages[other] > chainCoverages[selectedChain]) selectedChain = other;
                    }
                }
                const selectedDomains = entityDomains.filter(dom => dom.chunks[0].asymID === selectedChain);
                ((result[source] ??= {})[family] ??= {})[entityId] = selectedDomains;
            }
        }
    }
    return result;
}

/** Reorganize domains from source-family-entity to chain-source-family */
export function sortDomainsByChain(domains: { [source: string]: { [family: string]: { [entityId: string]: DomainRecord[] } } }) {
    const result = {} as { [chainId: string]: { [source: string]: { [family: string]: DomainRecord[] } } };

    for (const [source, sourceDomains] of Object.entries(domains)) {
        for (const [family, familyDomains] of Object.entries(sourceDomains)) {
            for (const entityDomains of Object.values(familyDomains)) {
                for (const dom of entityDomains) {
                    const chainId = dom.chunks[0].asymID;
                    (((result[chainId] ??= {})[source] ??= {})[family] ??= []).push(dom);
                }
            }
        }
    }
    return result;
}

/** For each combination of source-family-entity, count the number of domains */
export function countDomains(domains: { [source: string]: { [family: string]: { [entityId: string]: DomainRecord[] } } }) {
    const result = {} as { [source: string]: { [family: string]: { [entityId: string]: number } } };
    for (const [source, sourceDomains] of Object.entries(domains)) {
        for (const [family, familyDomains] of Object.entries(sourceDomains)) {
            for (const [entityId, entityDomains] of Object.entries(familyDomains)) {
                ((result[source] ??= {})[family] ??= {})[entityId] = entityDomains.length;
            }
        }
    }
    return result;
}
