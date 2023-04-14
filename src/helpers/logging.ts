import log4js from 'log4js';
import path from 'path';
import util from 'util';


export const LogLevels = ['all', 'trace', 'debug', 'info', 'warn', 'error', 'fatal', 'mark', 'off'] as const;
export type LogLevel = typeof LogLevels[number]

/** Set logging level and stream globally.
 * Use `configureLogging('off', 'stdout')` to disable all logs. */
export function configureLogging(level: LogLevel, stream: 'stdout' | 'stderr') {
    const layoutType = process[stream].isTTY ? 'colored' : 'basic';
    log4js.configure({
        appenders: {
            out: { type: stream, layout: { type: layoutType } },
        },
        categories: {
            default: { appenders: ['out'], level: level },
        },
    });
}

/** Get logger for a specific module.
 * Always call like this: `const logger = getLogger(module)` */
export function getLogger(module: NodeModule) {
    const modulePathParts = module.filename.split(path.sep);
    const rootPathLength = Math.max(modulePathParts.lastIndexOf('build'), modulePathParts.lastIndexOf('src')) + 1;
    const name = modulePathParts.slice(rootPathLength).join('/');
    const logger = log4js.getLogger(name);
    return logger;
}

/** Format object as a one-line string. */
export function oneLine(obj: object): string {
    return util.inspect(obj, { breakLength: Infinity });
}
