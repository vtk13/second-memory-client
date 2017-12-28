import React from 'react'
import $ from 'jquery'
import ReactDOM from 'react-dom'
import {assert} from 'chai'
import sinon from 'sinon'
import {SmEditor} from '../components/editor'
import {postpone} from '../util/util'

function click(x, y){
    let ev = document.createEvent('MouseEvent');
    let el = document.elementFromPoint(x, y);
    ev.initMouseEvent('click', true, true, window, null,
        x, y, x, y, false, false, false, false, 0, null);
    el.dispatchEvent(ev);
}

describe('editor', ()=>{
    describe('events', ()=>{
        let editor, editorElement = document.getElementById('editor1');
        afterEach(()=>{
            ReactDOM.unmountComponentAtNode(editorElement);
        });
        let t = (name, text, [x, y], cb, expected)=>it(name, async ()=>{
            editor = ReactDOM.render(<SmEditor text={text}/>, editorElement);
            let rect = $('.sm-text', editorElement).get(0).getBoundingClientRect();
            click(rect.x+x, rect.y+y);
            let state = await postpone(()=>editor.state);
            await cb(editor, state);
            sinon.assert.match(editor.document.export(), expected);
        });
        t('cursor position after click', '<div>qwe asd</div>', [22, 4],
            (editor, state)=>assert.deepEqual([state.cursorX, state.cursorY], [20, 3]),
            [[undefined, '<div>qwe asd</div>']]);
        t('type chars', '<div>qwe asd</div>', [20, 4], async (editor, state)=>{
            await editor.addChar('z');
            await editor.addChar('x');
        }, [[undefined, '<div>qwzxe asd</div>']]);
        t('backspace', '<div>qwe asd</div>', [20, 4], async (editor, state)=>{
            await editor.backspace();
        }, [[undefined, '<div>qe asd</div>']]);
    });
});
