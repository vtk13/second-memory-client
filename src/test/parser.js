import {assert} from 'chai'
import {SmParser} from '../components/editor'

describe('parser', ()=>{
    describe('readChar', ()=>{
        let parser;
        beforeEach(()=>{ parser = new SmParser('qwe'); });
        let t = (name, pos, match, expected)=>it(name, ()=>{
            assert.deepEqual(parser.readChar(pos, match), expected);
        });
        t('middle', 1, undefined, [true, 'w', 2]);
        t('re', 1, /\w/, [true, 'w', 2]);
        t('end', 3, undefined, [false, 'at the end', 3]);
        t('expected ok', 1, 'w', [true, 'w', 2]);
        t('expected fail', 1, 'q', [false, 'unmatched ch', 1]);
    });
    describe('readSeq', ()=>{
        let t = (name, str, match, expected)=>it(name, ()=>{
            let [ok, res, pos] = new SmParser(str).readSeq(0, match);
            assert.equal(res, expected);
        });
        t('read word', 'qwe asd', /\w/, 'qwe');
    });
    describe('matchString', ()=>{
        let parser;
        beforeEach(()=>{ parser = new SmParser('qwe \n asd'); });
        let t = (name, pos, match, expected)=>it(name, ()=>{
            assert.deepEqual(parser.matchString(pos, match), expected);
        });
        t('match string', 0, 'qwe', [true, 'qwe', 3]);
        t('unmatch string', 0, 'asd', [false, 'unmatched', 0]);
    });
    describe('readWord', ()=>{
        let parser;
        beforeEach(()=>{ parser = new SmParser('qwe asd'); });
        let t = (name, pos, expected)=>it(name, ()=>{
            assert.deepEqual(parser.readWord(pos), expected);
        });
        t('middle word', 1, [true, 'we', 3]);
        t('not a word', 3, [false, 'not a word', 3]);
        t('last word', 4, [true, 'asd', 7]);
        t('at the end', 7, [false, 'not a word', 7]);
    });
    describe('readTag', ()=>{
        it('p', ()=>{
            let [ok, tag, pos] = new SmParser('<p>qwe</p>').readTag(0);
            assert.deepEqual(tag,
                {type: 'p', children: [{type: 'text', text: 'qwe'}]});
        });
        it('b', ()=>{
            let [ok, tag, pos] = new SmParser('<b>qwe</b>').readTag(0);
            assert.deepEqual(tag,
                {type: 'b', children: [{type: 'text', text: 'qwe'}]});
        });
        it('children', ()=>{
            let [ok, tag, pos] = new SmParser('<p>qwe<b>asd</b></p>').readTag(0);
            assert.deepEqual(tag, {type: 'p', children: [
                {type: 'text', text: 'qwe'},
                {type: 'b', children: [{type: 'text', text: 'asd'}]}
            ]});
        });
    });
    describe('readDoc', ()=>{
        let t = (name, html, expected)=>it(name, ()=>{
            let doc = new SmParser(html).readDoc();
            assert.deepEqual(doc.children, expected);
        });
        t('condense', '<p>qwe</p><p>asd</p>', [
            {type: 'p', children: [{type: 'text', text: 'qwe'}]},
            {type: 'p', children: [{type: 'text', text: 'asd'}]},
        ]);
        t('sparse', ' <p>qwe</p>\n  <p>asd</p>  ', [
            {type: 'p', children: [{type: 'text', text: 'qwe'}]},
            {type: 'p', children: [{type: 'text', text: 'asd'}]},
        ]);
    });
    describe('structure', ()=>{
        it('b must be wrapped');
    });
});
