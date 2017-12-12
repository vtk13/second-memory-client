import {assert} from 'chai'
import {SmDocument} from '../components/editor'

describe('document', ()=>{
    describe('export', ()=>{
        let t = (name, str, expected)=>it(name, ()=>{
            let doc = new SmDocument(str);
            assert.equal(doc.export(), expected);
        });
        t('simple', '<p>qwe</p>', '<p>qwe</p>');
        t('nested', '<p>qwe</p><p>asd<b>zxc</b>rty</p>',
            '<p>qwe</p><p>asd<b>zxc</b>rty</p>');
        t('sparse', ' <p>qwe </p> \n <p> asd<b>zxc</b> rty</p>  ',
            '<p>qwe </p><p> asd<b>zxc</b> rty</p>');
    });
    describe('cursor', ()=>{
        describe('getChar', ()=>{
            let doc;
            beforeEach(()=>{
                doc = new SmDocument('<p>qwe</p><p>asd <b>zxc</b> rty</p>');
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
                doc = new SmDocument('<p>qwe</p><p>asd <b>zxc</b> rty</p>');
            });
            let t = (name, coord, ch, expected)=>it(name, ()=>{
                doc.insertCharAt(coord, ch);
                assert.equal(doc.export(), expected);
            });
            t('simple', [0, 0, 1], 'w', '<p>qwwe</p><p>asd <b>zxc</b> rty</p>');
            t('nested', [1, 1, 0, 2], 'c', '<p>qwe</p><p>asd <b>zxcc</b> rty</p>');
        });
    });
});
