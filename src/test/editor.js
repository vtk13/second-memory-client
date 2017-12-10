import React from 'react'
import ReactDOM from 'react-dom'
import {assert} from 'chai'
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
    let testText = 'qwe asd';
    let editor, editorElement = document.getElementById('editor1');
    beforeEach(()=>{
        editor = ReactDOM.render(<SmEditor text={testText}/>, editorElement);
    });
    afterEach(()=>{
        ReactDOM.unmountComponentAtNode(editorElement);
    });
    it('type chars', async ()=>{
        let rect = editorElement.getBoundingClientRect();
        click(rect.x+20, rect.y+4);
        let state = await postpone(()=>editor.state);
        assert.deepEqual([state.cursorX, state.cursorY], [20, 3]);
        await editor.addChar('z');
        await editor.addChar('x');
        assert.equal(editor.document.export(), 'qwzxe asd');
    });
    it('backspace', async ()=>{
        let rect = editorElement.getBoundingClientRect();
        click(rect.x+20, rect.y+4);
        let state = await postpone(()=>editor.state);
        assert.deepEqual([state.cursorX, state.cursorY], [20, 3]);
        await editor.backspace();
        assert.equal(editor.document.export(), 'qe asd');
    });
});
