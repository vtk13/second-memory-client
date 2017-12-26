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
    let testText = '<div>qwe asd</div>';
    let editor, editorElement = document.getElementById('editor1');
    beforeEach(()=>{
        editor = ReactDOM.render(<SmEditor text={testText}/>, editorElement);
    });
    afterEach(()=>{
        ReactDOM.unmountComponentAtNode(editorElement);
    });
    it('type chars', async ()=>{
        let rect = $('.sm-text', editorElement).get(0).getBoundingClientRect();
        click(rect.x+20, rect.y+4);
        let state = await postpone(()=>editor.state);
        assert.deepEqual([state.cursorX, state.cursorY], [19, 2]);
        await editor.addChar('z');
        await editor.addChar('x');
        sinon.assert.match(editor.document.export(),
            [[undefined, '<div>qwzxe asd</div>']]);
    });
    it('backspace', async ()=>{
        let rect = $('.sm-text', editorElement).get(0).getBoundingClientRect();
        click(rect.x+20, rect.y+4);
        let state = await postpone(()=>editor.state);
        assert.deepEqual([state.cursorX, state.cursorY], [19, 2]);
        await editor.backspace();
        sinon.assert.match(editor.document.export(),
            [[undefined, '<div>qe asd</div>']]);
    });
});
