import _ from 'lodash'
import $ from 'jquery'
import React from 'react'
import {postpone} from '../util/util'

/**
 * Sm Html parser
 *
 * Usually functions return [ok, res, pos]
 *   - ok: true/false
 *   - res: response payload or error message
 *   - pos: new cursor position after parsing chunk
 *
 * Node {
 *   type: <tag name> | 'text'
 *   text: <string> for text nodex
 *   children: <array> for tag nodes
 * }
 *
 * @param str
 * @constructor
 */
function SmParser(str){
    this.str = str;
}
SmParser.prototype.readChar = function(pos, match){
    if (pos>=this.str.length)
        return [false, 'at the end', pos];
    let ch = this.str[pos];
    if (match===undefined)
        return [true, ch, pos+1];
    if (match.test)
        return match.test(ch) ? [true, ch, pos+1] : [false, 'unmatched re', pos];
    return ch===match ? [true, ch, pos+1] : [false, 'unmatched ch', pos];
};
SmParser.prototype.readSeq = function(pos, match){
    let ok, ch, res = '';
    while (true){
        [ok, ch, pos] = this.readChar(pos, match);
        if (!ok)
            break;
        res += ch;
    }
    return [true, res, pos];
};
SmParser.prototype.matchString = function(pos, str){
    let ok, res, _pos = pos, chunk = '';
    do {
        [ok, res, _pos] = this.readChar(_pos);
        if (!ok)
            return [false, res, pos];
        chunk += res;
        if (str===chunk)
            return [true, chunk, _pos];
        if (chunk.length>=str.length)
            return [false, 'unmatched', pos];
    } while (true);
};
SmParser.prototype.readWord = function(pos){
    let word;
    [, word, pos] = this.readSeq(pos, /[a-zA-Z_-]/);
    return word.length ? [true, word, pos] : [false, 'not a word', pos];
};
SmParser.prototype.readText = function(pos){
    let ok, ch, text = '', re = /[^<]/;
    do {
        [ok, ch, pos] = this.readChar(pos, re);
        if (!ok)
            break;
        text += ch;
    } while (true);
    return text.length ? [true, text, pos] : [false, 'not a text', pos];
};
SmParser.prototype.readChildren = function(pos){
    let ok, res, _pos, children = [], anything;
    do {
        anything = false;
        [ok, res, _pos] = this.readText(pos);
        if (ok)
        {
            anything = true;
            pos = _pos;
            children.push({type: 'text', text: res});
            continue;
        }
        [ok, res, _pos] = this.readTag(pos);
        if (ok)
        {
            anything = true;
            pos = _pos;
            children.push(res);
        }
    } while (anything);
    return children.length ? [true, children, pos] : [false, 'empty', pos];
};
SmParser.prototype.readTag = function(pos){
    let ok, _pos, type, tag = {};
    [, , pos] = this.readSeq(pos, /\s/);
    [ok, , _pos] = this.readChar(pos, '<');
    if (!ok)
        return [false, 'not a tag', pos];
    [ok, tag.type, _pos] = this.readWord(_pos);
    if (!ok)
        return [false, 'not a tag', pos];
    pos = _pos;
    if (!['p', 'b'].includes(tag.type))
        throw this.err('tag name', 'p, b', pos);
    [ok, , pos] = this.readChar(pos, '>');
    if (!ok)
        throw this.err('tag closing', '>', pos);
    [, , pos] = this.readSeq(pos, /\s/);
    [ok, tag.children, pos] = this.readChildren(pos);
    if (!ok)
        tag.children = [];
    [ok, , pos] = this.matchString(pos, `</${tag.type}>`);
    if (!ok)
        throw this.err('closing tag', `</${tag.type}>`, pos);
    [, , pos] = this.readSeq(pos, /\s/);
    return [true, tag, pos];
};
SmParser.prototype.readDoc = function(){
    let ok, tag, pos = 0, tags = [];
    do {
        [ok, tag, pos] = this.readTag(pos);
        if (!ok)
            break;
        tags.push(tag);
    } while (true);
    if (pos!=this.str.length)
        throw this.err('end of document', '', pos);
    return {type: 'doc', children: tags};
};
SmParser.prototype.err = function(type, expected, pos, actual){
    if (actual===undefined)
    {
        let {min, max} = Math, l = this.str.length;
        actual = [this.str.slice(max(pos-5, 0), max(pos, 0)),
            '[', this.str[pos], ']',
            this.str.slice(min(pos+1, l), min(pos+6, l))].join('');
    }
    return new Error(`Expected ${type} ${JSON.stringify(expected)}, `
        +`${JSON.stringify(actual)} given at pos ${pos}`);
};

function SmDocument(str){
    this.doc = new SmParser(str).readDoc();
}
SmDocument.prototype.getNodes = function(){
    return this.doc.children;
};
// TODO ugly node attribute
SmDocument.prototype.insertChar = function(node, pos, char){
    let tn = this.doc.children[node].children[0];
    tn.text = [tn.text.slice(0, pos), char, tn.text.slice(pos)].join('');
};
SmDocument.prototype.removeCharBeforeOffset = function(node, pos){
    let tn = this.doc.children[node].children[0];
    tn.text = [tn.text.slice(0, pos-1), tn.text.slice(pos)].join('');
};
SmDocument.prototype.export = function(){
    return _.map(this.doc.children, node=>node.children[0].text).join('\n');
};

class SmCursor extends React.Component {
    render(){
        if (this.props.x<0 || this.props.y<0)
            return null;
        return <div className="sm-cursor" style={{left: (this.props.x||0) - 2, top: (this.props.y||0) - 3}}>|</div>;
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
        this._setCursorXY(-11, -11);
        let charPos = await postpone(()=>{
            let charPos = this._getCharPosRel(cursorX, cursorY);
            // TODO when cursor is outside of editor, charPos might be a different element without sm-id
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
            {_.map(this.document.getNodes(), (v, k)=>
                <p key={k} data-sm-id={k}>{v.children[0].text}</p>
            )}
            <SmCursor x={this.state.cursorX} y={this.state.cursorY}/>
        </div>;
    }
}

export {SmEditor, SmParser}
