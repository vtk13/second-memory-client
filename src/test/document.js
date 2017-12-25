import {assert} from 'chai'
import sinon from 'sinon'
import {SmDocument} from '../components/editor'

describe('document', ()=>{
    describe('export', ()=>{
        let t = (name, str, expected)=>it(name, ()=>{
            let doc = new SmDocument(str);
            sinon.assert.match(doc.export(), expected);
        });
        t('simple', '<div>qwe</div>', [[undefined, '<div>qwe</div>']]);
        t('nested', '<div>qwe</div><div>asd<b>zxc</b>rty</div>',
            [[undefined, '<div>qwe</div><div>asd<b>zxc</b>rty</div>']]);
        t('nested_docs', '<div>qwe<doc id="1"><div>asd</div></doc></div>',
            [[undefined, '<div>qwe<doc id="1"></doc></div>'], ['1', '<div>asd</div>']]);
        t('sparse', ' <div>qwe </div> \n <div> asd<b>zxc</b> rty</div>  ',
            [[undefined, '<div>qwe </div><div> asd<b>zxc</b> rty</div>']]);
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
                sinon.assert.match(doc.export(), expected);
            });
            t('simple', [0, 0, 1], 'w', [[undefined, '<div>qwwe</div><div>asd <b>zxc</b> rty</div>']]);
            t('nested', [1, 1, 0, 2], 'c', [[undefined, '<div>qwe</div><div>asd <b>zxcc</b> rty</div>']]);
        });
    });
});
