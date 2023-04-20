/**
 * Copyright (c) 2023 EMBL - European Bioinformatics Institute, licensed under Apache 2.0, see LICENSE file for more info.
 *
 * @author Adam Midlik <midlik@gmail.com>
 */

import { TextBuilder } from '../text-builder';


describe('TextBuilder', () => {
    it('plain', () => {
        const builder = new TextBuilder();
        builder.push('Lorem', 'ipsum', 'dolor', 'sit', 'amet', '.');
        expect(builder.buildPlainText()).toEqual('Lorem ipsum dolor sit amet.');
        expect(builder.buildText()).toEqual('Lorem ipsum dolor sit amet.');
    });

    it('punctuation', () => {
        const builder = new TextBuilder();
        builder.push('Important notice', ':', 'reading this sentence', '-', 'or its part', '-', ',',
            'might cause severe health issues', ',', ',', 'including death', ',', ';', 'beware reading',
            'to the end', ',', ';', '.', '!', '!');
        expect(builder.buildPlainText()).toEqual('Important notice: reading this sentence – or its part – might cause severe health issues, including death; beware reading to the end!');
        expect(builder.buildText()).toEqual('Important notice: reading this sentence – or its part – might cause severe health issues, including death; beware reading to the end!');
    });

    it('html', () => {
        const builder = new TextBuilder();
        builder.push('Lorem', '<b>', 'ipsum', '</b>', '<i>', 'dolor', '</i>', 'sit', '<span class="importante">', 'amet', '</span>', '.');
        expect(builder.buildPlainText()).toEqual('Lorem ipsum dolor sit amet.');
        expect(builder.buildText()).toEqual('Lorem <b>ipsum</b> <i>dolor</i> sit <span class="importante">amet</span>.');
    });

    it('html nested', () => {
        const builder = new TextBuilder();
        builder.push('My favourite fruits', ':', '<ul>', '<li>', 'apple', ',', '</li>', '<li>', 'banana', ',', '</li>',
            '<li>', 'more bananas', ',', '</li>', '<li>', '<b>', 'watermelon', '</b>', ',', '</li>', '</ul>', '.');
        expect(builder.buildPlainText()).toEqual('My favourite fruits: apple, banana, more bananas, watermelon.');
        expect(builder.buildText()).toEqual('My favourite fruits: <ul><li>apple,</li> <li>banana,</li> <li>more bananas,</li> <li><b>watermelon</b>.</li></ul>');
    });
});
