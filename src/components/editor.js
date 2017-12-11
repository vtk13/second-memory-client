import _ from 'lodash'
import $ from 'jquery'
import React from 'react'
import {postpone} from '../util/util'

function SmParser(str){
    this.str = str;
}
SmParser.prototype.readChar = function(pos){
    if (pos<this.str.length)
        return [this.str[pos], pos+1];
    return [false, pos];
};
SmParser.prototype.readParagraph = function(pos){
    let char, res = '';
    do {
        [char, pos] = this.readChar(pos);
        if (char===false || char==='\n')
            break;
        res += char;
    } while (true);
    return [res.length>0 ? res : false, pos];
};
SmParser.prototype[Symbol.iterator] = function*(){
    let pos = 0, str = this.str, p;
    do {
        [p, pos] = this.readParagraph(pos);
        if (p===false)
            break;
        yield p;
    } while (true);
};

function SmDocument(str){
    this.parser = new SmParser(str);
    this.nodes = [...this.parser];
}
SmDocument.prototype.getNodes = function(){
    return this.nodes;
};
// TODO ugly node attribute
SmDocument.prototype.insertChar = function(node, pos, char){
    let str = this.nodes[node];
    str = [str.slice(0, pos), char, str.slice(pos)].join('');
    this.nodes[node] = str;
};
SmDocument.prototype.removeCharBeforeOffset = function(node, pos){
    let str = this.nodes[node];
    str = [str.slice(0, pos-1), str.slice(pos)].join('');
    this.nodes[node] = str;
};
SmDocument.prototype.export = function(){
    return this.nodes.join('\n');
};

class SmCursor extends React.Component {
    render(){
        if (this.props.x<0 || this.props.y<0)
            return null;
        return <div className="sm-cursor" style={{left: this.props.x||0, top: this.props.y||0}}>|</div>;
    }
}

// let kn = ['altKey', 'charCode', 'ctrlKey', 'key', 'keyCode', 'locale', 'location', 'metaKey', 'repeat', 'shiftKey', 'which'];
let kn = ['key'];

class SmEditor extends React.Component {
    constructor(props){
        super(props);
        this.document = new SmDocument(props.text);
        this.state = {cursorX: 0, cursorY: 0};
        this.charsToInsert = [];
        this.insertInProgress = false;
    }
    addChar(char){
        this.charsToInsert.push(char);
        return this._insertChars();
    }
    backspace(){
        return this._removeCharBeforeCursor();
    }
    async _insertChars(){
        if (this.insertInProgress || this.charsToInsert.length==0)
            return;
        this.insertInProgress = true;
        let cursorX = this.state.cursorX, cursorY = this.state.cursorY, key = this.charsToInsert.shift();
        this._setCursorXY(-10, -10);
        let charPos = await postpone(()=>{
            let charPos = this._getCharPosRel(cursorX, cursorY);
            this.document.insertChar($(charPos.elm.parentNode).data('sm-id'), charPos.offset, key);
            this.forceUpdate();
            return charPos;
        });
        return await postpone(()=>{
            let charPos2 = this._getPosForOffset(charPos.elm, charPos.offset+1);
            this._setCursorXY(charPos2.x, charPos2.y);
            this.insertInProgress = false;
            return this._insertChars();
        });
    }
    async _removeCharBeforeCursor(){
        if (this.insertInProgress)
            return;
        this.insertInProgress = true;
        let cursorX = this.state.cursorX, cursorY = this.state.cursorY;
        this._setCursorXY(-10, -10);
        let charPos = await postpone(()=>{
            let charPos = this._getCharPosRel(cursorX, cursorY);
            if (charPos.offset==0)
                return; // TODO join nodes
            this.document.removeCharBeforeOffset($(charPos.elm.parentNode).data('sm-id'), charPos.offset);
            this.forceUpdate();
            return charPos;
        });
        let res;
        if (charPos)
            res = await postpone(()=>{
                let charPos2 = this._getPosForOffset(charPos.elm, charPos.offset-1);
                this._setCursorXY(charPos2.x, charPos2.y);
                return this._insertChars();
            });
        // else TODO join nodes
        this.insertInProgress = false;
        return res;
    }
    _getCharPos(clientX, clientY){
        let rect = this.ref.getBoundingClientRect();
        let range = document.caretRangeFromPoint(clientX, clientY);
        let rangeRect = range.getBoundingClientRect();
        return {elm: range.startContainer, offset: range.startOffset,
            x: rangeRect.x - rect.x, y: rangeRect.y - rect.y};
    }
    _getCharPosRel(x, y){
        let rect = this.ref.getBoundingClientRect();
        return this._getCharPos(rect.x + x, rect.y + y);
    }
    _getPosForOffset(node, offset){
        let range = document.createRange();
        range.setStart(node, offset);
        range.setEnd(node, offset);
        let rect = range.getBoundingClientRect();
        return this._getCharPos(rect.x, rect.y);
    }
    _setCursorXY(x, y){
        this.setState({cursorX: x, cursorY: y});
    }
    _onElmClick(e){
        let charPos = this._getCharPos(e.clientX, e.clientY);
        this._setCursorXY(charPos.x, charPos.y);
    }
    _onKeyUp(e){
        e.preventDefault();
        console.log('up', _.pick(e, kn));
        switch (e.key){
        case 'Backspace':
            return this._removeCharBeforeCursor();
        }
    }
    _onKeyPress(e){
        console.log('press', _.pick(e, kn));
        this.addChar(e.key);
    }
    render(){
        return <div tabIndex="0" ref={e=>this.ref = e} className="sm-text"
            onClick={e=>this._onElmClick(e)} onKeyPress={e=>this._onKeyPress(e)} onKeyUp={e=>this._onKeyUp(e)}>
            {_.map(this.document.getNodes(), (v, k)=><p key={k} data-sm-id={k}>{v}</p>)}
            <SmCursor x={this.state.cursorX-2} y={this.state.cursorY-3}/>
        </div>;
    }
}

export {SmEditor}
