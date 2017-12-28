import React from 'react'
import $ from 'jquery'
import ReactDOM from 'react-dom'
import {assert} from 'chai'
import sinon from 'sinon'
import {SmEditor} from '../components/editor'
import {postpone} from '../util/util'

describe('editor', ()=>{
    describe('events', ()=>{
        let editor, editorElement = document.getElementById('editor1');
        afterEach(()=>{
            ReactDOM.unmountComponentAtNode(editorElement);
        });
        let t = (name, text, coord, cb, expected)=>it(name, async ()=>{
            editor = ReactDOM.render(<SmEditor text={text}/>, editorElement);
            editor.document.setCursor(coord);
            await editor.updateSelection();
            await cb(editor);
            sinon.assert.match(editor.ref.innerText, expected);
        });
        t('cursor position after click', '<div>qwe asd</div>', [0, 0, 2],
            editor=>{
                let {anchorNode, anchorOffset} = window.getSelection();
                assert.equal(editor.ref.childNodes[0].childNodes[0], anchorNode);
                assert.equal(2, anchorOffset);
            },
            'qwe asd');
        t('type chars', '<div>qwe asd</div>', [0, 0, 2], async editor=>{
            await editor.addChar('z');
            await editor.addChar('x');
        }, 'qwzxe asd');
        t('backspace', '<div>qwe asd</div>', [0, 0, 2], async editor=>{
            await editor.backspace();
        }, 'qe asd');
    });
});
