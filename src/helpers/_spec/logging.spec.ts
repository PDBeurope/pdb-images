/**
 * Copyright (c) 2023 EMBL - European Bioinformatics Institute, licensed under Apache 2.0, see LICENSE file for more info.
 *
 * @author Adam Midlik <midlik@gmail.com>
 */

import { configureLogging, getLogger } from '../logging';


function captureStream(stream: 'stdout' | 'stderr') {
    const outputs: string[] = [];
    const oldWrite = process[stream].write;
    const mockWrite = jest.fn((content, ...options) => {
        outputs.push(String(content));
        return true;
    });
    process[stream].write = mockWrite;
    return {
        output: () => {
            process[stream].write = oldWrite;
            return outputs.join();
        },
    };
}


describe('logging', () => {
    it('captureStream helper', () => {
        const capture = captureStream('stdout');
        process.stdout.write('Testing captureStream'); // for some reason doesn't work with console.log
        expect(capture.output()).toMatch(/Testing captureStream/);
    });

    it('logging on stdout', () => {
        configureLogging('all', 'stdout');
        const logger = getLogger(module);
        const capture = captureStream('stdout');
        logger.info('Spam, spam, spam');
        expect(capture.output()).toMatch(/INFO.*Spam, spam, spam.*/);
    });

    it('logging on stderr', () => {
        configureLogging('all', 'stderr');
        const logger = getLogger(module);
        const capture = captureStream('stderr');
        logger.info('Spam, spam, spam');
        expect(capture.output()).toMatch(/INFO.*Spam, spam, spam.*/);
    });

    it('logging DEBUG', () => {
        configureLogging('all', 'stderr');
        const logger = getLogger(module);
        const capture = captureStream('stderr');
        logger.debug('Ham, ham, ham');
        expect(capture.output()).toMatch(/DEBUG.*Ham, ham, ham.*/);
    });

    it('logging skip DEBUG when level=INFO', () => {
        configureLogging('info', 'stderr');
        const logger = getLogger(module);
        const capture = captureStream('stderr');
        logger.debug('Ham, ham, ham');
        expect(capture.output()).toEqual('');
    });

    it('logging print INFO when level=DEBUG', () => {
        configureLogging('debug', 'stderr');
        const logger = getLogger(module);
        const capture = captureStream('stderr');
        logger.info('Spam, spam, spam');
        expect(capture.output()).toMatch(/INFO.*Spam, spam, spam.*/);
    });

    it('logging print INFO when level=INFO', () => {
        configureLogging('info', 'stderr');
        const logger = getLogger(module);
        const capture = captureStream('stderr');
        logger.info('Spam, spam, spam');
        expect(capture.output()).toMatch(/INFO.*Spam, spam, spam.*/);
    });

    it('logging skip all when level=OFF', () => {
        configureLogging('off', 'stderr');
        const logger = getLogger(module);
        const capture = captureStream('stderr');
        logger.debug('Ham, ham, ham');
        logger.info('Spam, spam, spam');
        logger.warn('Spanish inquisition coming');
        logger.error('Nobody expected Spanish inquisition');
        expect(capture.output()).toEqual('');
    });
});
