import {assert} from 'chai'
import sinon from 'sinon'
import {parseHtmlTree, t as parser} from 'components/editor/parser'

describe('parser', ()=>{
    describe('readChar', ()=>{
        let t = (name, pos, match, expected)=>it(name, ()=>{
            assert.deepEqual(parser.readChar('qwe', pos, match), expected);
        });
        t('middle', 1, undefined, [true, 'w', 2]);
        t('re', 1, /\w/, [true, 'w', 2]);
        t('end', 3, undefined, [false, 'at the end', 3]);
        t('expected ok', 1, 'w', [true, 'w', 2]);
        t('expected fail', 1, 'q', [false, 'unmatched ch', 1]);
    });
    describe('readSeq', ()=>{
        let t = (name, str, match, expected)=>it(name, ()=>{
            let [ok, res, pos] = parser.readSeq(str, 0, match);
            assert.equal(res, expected);
        });
        t('read word', 'qwe asd', /\w/, 'qwe');
    });
    describe('matchString', ()=>{
        let t = (name, pos, match, expected)=>it(name, ()=>{
            assert.deepEqual(parser.matchString('qwe \n asd', pos, match), expected);
        });
        t('match string', 0, 'qwe', [true, 'qwe', 3]);
        t('unmatch string', 0, 'asd', [false, 'unmatched', 0]);
    });
    describe('readWord', ()=>{
        let t = (name, pos, expected)=>it(name, ()=>{
            assert.deepEqual(parser.readWord('qwe asd', pos), expected);
        });
        t('middle word', 1, [true, 'we', 3]);
        t('not a word', 3, [false, 'not a word', 3]);
        t('last word', 4, [true, 'asd', 7]);
        t('at the end', 7, [false, 'not a word', 7]);
    });
    describe('readTag', ()=>{
        it('div', ()=>{
            let [ok, tag, pos] = parser.readTag('<div>qwe</div>', 0);
            sinon.assert.match(tag,
                {type: 'div', children: [{type: 'text', text: 'qwe'}]});
        });
        it('b', ()=>{
            let [ok, tag, pos] = parser.readTag('<b>qwe</b>', 0);
            sinon.assert.match(tag,
                {type: 'b', children: [{type: 'text', text: 'qwe'}]});
        });
        it('self-closing', ()=>{
            let [ok, tag, pos] = parser.readTag('<b><img src="1" /></b>', 0);
            sinon.assert.match(tag,
                {type: 'b', children: [{type: 'img', children: [], attrs: { src: "1" }}]});
        });
        describe('attributes', ()=>{
            let t = (name, str, expected)=>it(name, ()=>{
                let [ok, tag, pos] = parser.readTag(str, 0);
                assert.deepEqual(tag.attrs, expected);
            });
            t('no attrs', '<div></div>', {});
            t('one attr', '<div a="b"></div>', {a: 'b'});
            t('two attrs', '<div a="b" c="d"></div>', {a: 'b', c: 'd'});
        });
        it('children', ()=>{
            let [ok, tag, pos] = parser.readTag('<div>qwe<b>asd</b></div>', 0);
            sinon.assert.match(tag, {type: 'div', children: [
                {type: 'text', text: 'qwe'},
                sinon.match({type: 'b', children: [{type: 'text', text: 'asd'}]})
            ]});
        });
    });
    describe('parseHtmlTree', ()=>{
        let t = (name, html, expected)=>it(name, ()=>{
            let doc = parseHtmlTree(html);
            sinon.assert.match(doc.children, expected);
        });
        t('condense', '<div>qwe</div><div>asd</div>', [
            sinon.match({type: 'div', children: [{type: 'text', text: 'qwe'}]}),
            sinon.match({type: 'div', children: [{type: 'text', text: 'asd'}]}),
        ]);
        t('sparse', ' <div>qwe</div>\n  <div>asd</div>  ', [
            sinon.match({type: 'div', children: [{type: 'text', text: 'qwe'}]}),
            sinon.match({type: 'div', children: [{type: 'text', text: 'asd'}]}),
        ]);
    });
    describe('structure', ()=>{
        it('b must be wrapped');
    });
});
