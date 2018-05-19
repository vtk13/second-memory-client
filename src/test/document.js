import {assert} from 'chai'
import sinon from 'sinon'
import {SmDocument} from '../components/editor'
import {exportTree} from 'components/editor/tree'

describe('document', ()=>{
    describe('traverse', ()=>{
        let t = (name, html, cb, expected)=>it(name, ()=>{
            let doc = new SmDocument(html);
            let res = [];
            doc.traverse(node=>{
                res.push(cb(node));
            });
            assert.deepEqual(expected, res);
        });
        t('count', '<p>qwe<span>asd</span>zxc</p>', ()=>1, [1, 1, 1, 1, 1, 1]);
    });
    describe('cursor', ()=>{
        describe('getChar', ()=>{
            let doc;
            beforeEach(()=>{
                doc = new SmDocument('<div>qwe</div><div>asd <b>zxc</b> rty</div>');
            });
            let t = (name, coord, expected)=>it(name, ()=>{
                assert.equal(doc.getCharAtCoord(coord), expected);
            });
            t('simple', [0, 0, 1], 'w');
            t('nested', [1, 1, 0, 2], 'c');
        });
        describe('insertCharAt', ()=>{
            let doc;
            beforeEach(()=>{
                doc = new SmDocument('<div>qwe</div><div>asd <b>zxc</b> rty</div>');
            });
            let t = (name, coord, ch, expected)=>it(name, ()=>{
                doc.insertCharAt(coord, ch);
                sinon.assert.match(exportTree(doc.root), expected);
            });
            t('simple', [0, 0, 1], 'w', [[undefined, '<div>qwwe</div><div>asd <b>zxc</b> rty</div>']]);
            t('nested', [1, 1, 0, 2], 'c', [[undefined, '<div>qwe</div><div>asd <b>zxcc</b> rty</div>']]);
        });
        // todo the same as tree/mergeAt tests?
        describe('removeCharBefore', ()=>{
            let doc;
            beforeEach(()=>{
                doc = new SmDocument('<div>qwe</div><div>asd<b>fgh</b>zxc</div>');
            });
            let t = (name, coord, newCoord, expected)=>it(name, ()=>{
                assert.deepEqual(doc.removeCharBefore(coord), newCoord);
                sinon.assert.match(exportTree(doc.root), expected);
            });
            t('in text', [1, 0, 2], [1, 0, 1], [[undefined, '<div>qwe</div><div>ad<b>fgh</b>zxc</div>']]);
            it.skip('beginning of inline');
            t('beginning of block', [1, 0, 0], [0, 0, 3], [[undefined, '<div>qweasd<b>fgh</b>zxc</div>']]);
        });
        describe('split', ()=>{
            let doc;
            beforeEach(()=>{
                doc = new SmDocument('<div>qwe</div><div>asd <b>zxc</b> rty</div>');
            });
            let t = (name, coord, newCoord, expected)=>it(name, ()=>{
                assert.deepEqual(doc.splitAt(coord), newCoord);
                sinon.assert.match(exportTree(doc.root), expected);
            });
            t('block', [0, 0, 2], [1, 0, 0], [[undefined,
                '<div>qw</div><div>e</div><div>asd <b>zxc</b> rty</div>']]);
            t('inline', [1, 1, 0, 2], [2, 0, 0, 0],
                [[undefined, '<div>qwe</div><div>asd <b>zx</b></div><div><b>c</b> rty</div>']]);
            t('before inline', [1, 0, 2], [2, 0, 0],
                [[undefined, '<div>qwe</div><div>as</div><div>d <b>zxc</b> rty</div>']]);
        });
    });
});
