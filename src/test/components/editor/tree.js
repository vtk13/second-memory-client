import {assert} from 'chai'
import {createNode, getSiblings, listVertical, mergeAt, exportTree} from 'components/editor/tree'
import {parseHtmlTree} from 'components/editor/parser'
import sinon from 'sinon'

describe('tree', ()=>{
    describe('createNode', ()=>{
        it('div', ()=>{
            assert.deepEqual(createNode('div'), {type: 'div', children: [], attrs: {}});
        });
        it('text', ()=>{
            assert.deepEqual(createNode('text'), {type: 'text', text: ''});
        });
    });
    describe('mergeAt', ()=>{
        it.skip('beginning of inline');
        it('beginning of block', ()=>{
            let root = parseHtmlTree('<div>qwe</div><div>asd</div>');
            assert.deepEqual(mergeAt(root, [1, 0, 0]), [0, 0, 3]);
            assert.equal(exportTree(root)[0][1], '<div>qweasd</div>');
        });
    });
    describe('getSiblings', ()=>{
        it('regular', ()=>{
            let root = parseHtmlTree('<div>qwe<b>asd</b>zxc</div>');
            sinon.assert.match(getSiblings(root, [0, 1]), [sinon.match({text: 'qwe'}), sinon.match({text: 'zxc'})]);
        });
        it('left edge', ()=>{
            let root = parseHtmlTree('<div>qwe<b>asd</b>zxc</div>');
            sinon.assert.match(getSiblings(root, [0, 0]), [undefined, sinon.match({type: 'b'})]);
        });
        it('right edge', ()=>{
            let root = parseHtmlTree('<div>qwe<b>asd</b>zxc</div>');
            sinon.assert.match(getSiblings(root, [0, 2]), [sinon.match({type: 'b'}), undefined]);
        });
    });
    describe('listVertical', ()=>{
        it('regular', ()=>{
            let root = parseHtmlTree('<div>qwe<b>asd</b>zxc</div>');
            sinon.assert.match(listVertical(root, [0, 1, 0]),
                [sinon.match({type: 'text'}), sinon.match({type: 'b'}), sinon.match({type: 'div'})]);
        });
    });
    describe('export', ()=>{
        let t = (name, str, expected)=>it(name, ()=>{
            let root = parseHtmlTree(str);
            sinon.assert.match(exportTree(root), expected);
        });
        t('simple', '<div>qwe</div>', [[undefined, '<div>qwe</div>']]);
        t('nested', '<div>qwe</div><div>asd<b>zxc</b>rty</div>',
            [[undefined, '<div>qwe</div><div>asd<b>zxc</b>rty</div>']]);
        t('nested_docs', '<div>qwe<doc id="1"><div>asd</div></doc></div>',
            [[undefined, '<div>qwe<doc id="1"></doc></div>'], ['1', '<div>asd</div>']]);
        t('sparse', ' <div>qwe </div> \n <div> asd<b>zxc</b> rty</div>  ',
            [[undefined, '<div>qwe </div><div> asd<b>zxc</b> rty</div>']]);
    });
});
