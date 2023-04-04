/**
 * Copyright (c) 2023 Adam Midlik, licensed under MIT, see LICENSE file for more info.
 *
 * @author Adam Midlik <midlik@gmail.com>
 */


/** Helper class for building text.
 * Automatically deals with puctuation (e.g. remove comma after last list item if a period follows, replace hyphen by en-dash),
 * spaces, and HTML tags. */
export class TextBuilder {
    /** Tokens added so far (words, punctiontion, HTML tags...). */
    private readonly tokens: string[] = [];

    /** Add more text to the builder. Each token can be: word, more words, single punctuation character (,;-:.), or single HTML tag. */
    push(...tokens: string[]) {
        this.tokens.push(...tokens);
        return this;
    }

    /** Return the built text, including HTML tags. */
    buildText() {
        return buildText(this.tokens, true);
    }

    /** Return the built text, without HTML tags. */
    buildPlainText() {
        return buildText(this.tokens, false);
    }
}


/** Priorities of punctuation characters when resolving puntuation clusters (e.g. period overrides comma). */
const PUNCTUATION_PRIORITY = { ',': 1, ';': 2, '-': 3, ':': 4, '.': 5, '?': 5, '!': 5 };

/** Resolve punctuation, add spaces as necessary, and return resulting text (with or without HTML) tags. */
function buildText(tokens: string[], keepHTML: boolean): string {
    if (!keepHTML) {
        tokens = tokens.filter(s => !isTag(s));
    }
    let result: string[] = [];
    let previous = undefined;
    for (const next of resolvePunctuation(tokens)) {
        if (needsSpace(previous, next)) {
            result.push(' ');
            result.push(next);
            previous = !isTag(next) ? next : undefined;
        } else {
            result.push(next);
            previous = !isTag(next) ? next : previous;
        }
    }
    result = result.map(s => s === '-' ? '–' : s);
    return result.join('');
}

/** Replace punctuation cluster by single highest-priority punctuation (e.g. Lorem -, ipsum - .,.. -> Lorem - ipsum.). */
function resolvePunctuation(tokens: string[]): string[] {
    const result: string[] = [];
    let lastPunctIndex: number | undefined = undefined;
    for (const next of tokens) {
        if (next === '') {
            continue;
        } else if (isTag(next)) {
            result.push(next);
        } else if (isPunctuation(next)) {
            if (lastPunctIndex !== undefined) {
                if (getPunctuationPriority(next)! >= getPunctuationPriority(result[lastPunctIndex])!) {
                    result[lastPunctIndex] = next;
                }
            } else {
                result.push(next);
                lastPunctIndex = result.length - 1;
            }
        } else {
            result.push(next);
            lastPunctIndex = undefined;
        }
    }
    return result;
}

/** Decide if `token` is a HTML tag. */
function isTag(token: string) {
    return token.startsWith('<') && token.endsWith('>');
}

function isTagStart(token: string) {
    return isTag(token) && !token.startsWith('</');
}

function isTagEnd(token: string) {
    return isTag(token) && token.startsWith('</');
}

function getPunctuationPriority(token: string): number | undefined {
    return PUNCTUATION_PRIORITY[token as keyof typeof PUNCTUATION_PRIORITY];
}

/** Decide if `token` is a punctuation character. */
function isPunctuation(token: string) {
    return getPunctuationPriority(token) !== undefined;
}

/** Decide if a space should be added between two tokens. */
function needsSpace(first?: string, second?: string) {
    if (first === undefined || second === undefined) return false;
    if (isTag(first) && isTag(second)) return false;
    if (isTagStart(first) || isTagEnd(second)) return false;
    if (isPunctuation(second) && second !== '-') return false;
    return true;
}
