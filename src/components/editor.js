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
SmParser.prototype.readAttributes = function(pos){
    [, , pos] = this.readSeq(pos, /\s/);
    let res = {}, ok, name, val;
    while (!this.readChar(pos, '>')[0])
    {
        [ok, name, pos] = this.readWord(pos);
        if (!ok)
            return [false, 'invalid attr name', pos];
        [ok, , pos] = this.readChar(pos, '=');
        if (!ok)
            return [false, '= expected', pos];
        [ok, , pos] = this.readChar(pos, '"');
        if (!ok)
            return [false, '" expected', pos];
        [, val, pos] = this.readSeq(pos, /[^"]/);
        [ok, , pos] = this.readChar(pos, '"');
        if (!ok)
            return [false, '" expected', pos];
        if (res[name])
            return [false, `attribute '${name}' duplication`, pos];
        res[name] = val;
    }

    return [true, res, pos];
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
    if (!['div', 'b', 'doc'].includes(tag.type))
        throw this.err('tag name', 'div, b, doc', pos);
    [ok, tag.attrs, pos] = this.readAttributes(pos);
    [ok, , pos] = this.readChar(pos, '>');
    if (!ok)
        throw this.err('tag closing', '>', pos);
    [ok, tag.children, pos] = this.readChildren(pos);
    if (!ok)
        tag.children = [];
    [ok, , pos] = this.matchString(pos, `</${tag.type}>`);
    if (!ok)
        throw this.err('closing tag', `</${tag.type}>`, pos);
    return [true, tag, pos];
};
SmParser.prototype.readDoc = function(id){
    let ok, tag, pos = 0, tags = [];
    do {
        [ok, tag, pos] = this.readTag(pos);
        if (!ok)
            break;
        tags.push(tag);
    } while (true);
    if (pos!=this.str.length)
        throw this.err('end of document', '', pos);
    return {type: 'doc', attrs: {id}, children: tags};
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

function SmDocument(text){
    switch (typeof text){
        case 'object':
            this.root = text;
            break;
        case 'string':
            this.root = new SmParser(text).readDoc();
            break;
        default:
            throw new Error('invalid SmDocument(str) parameter type');
    }
    this.coord = [0, 0];
}
SmDocument.prototype.setCursor = function(coord){
    this.coord = coord;
};
SmDocument.prototype.getNodes = function(){
    return this.root.children;
};
SmDocument.prototype.getPathByCoord = function(coord){
    coord = coord||this.coord;
    let res = [], node = this.root;
    for (let i = 0; i < coord.length-1; i++)
    {
        res.push(node.children[coord[i]]);
        node = node.children[coord[i]];
    }
    return res;
};
SmDocument.prototype.getNodeByCoord = function(coord){
    let node = this.root;
    for (let i = 0; i < coord.length; i++)
        node = node.children[coord[i]];
    return node;
};
SmDocument.prototype._splitCoord = function(coord){
    let node = this.getNodeByCoord(coord.slice(0, coord.length-1));
    return [node, coord[coord.length-1]];
};
SmDocument.prototype.getCharAtCoord = function(coord){
    let [node, pos] = this._splitCoord(coord);
    return node.text[pos];
};
SmDocument.prototype.insertCharAt = function(coord, ch){
    let [node, pos] = this._splitCoord(coord);
    node.text = [node.text.slice(0, pos), ch, node.text.slice(pos)].join('');
};
SmDocument.prototype.insertCharAtCursor = function(ch){
    this.insertCharAt(this.coord, ch);
    this.coord[this.coord.length-1]++;
};
SmDocument.prototype.removeCharBefore = function(coord){
    let [node, pos] = this._splitCoord(coord);
    if (pos>0)
        node.text = [node.text.slice(0, pos-1), node.text.slice(pos)].join('');
    return pos>0;
};
SmDocument.prototype.removeCharBeforeCursor = function(){
    if (this.removeCharBefore(this.coord))
        this.coord[this.coord.length-1]--;
};
SmDocument.prototype.exportText = function(node){
    return node.text;
};
SmDocument.prototype.exportTag = function(node, docs){
    let res;
    if (node.type=='doc')
    {
        res = `<doc id="${node.attrs.id}"></doc>`;
        docs.push(node);
    }
    else
    {
        [res, docs] = this.exportList(node.children, docs);
        res = '<'+node.type+'>'+res+'</'+node.type+'>';
    }
    return [res, docs];
};
SmDocument.prototype.exportList = function(list, docs){
    let res = '', tag;
    for (let child of list)
    {
        if (child.type=='text')
            res += this.exportText(child);
        else
        {
            [tag, docs] = this.exportTag(child, docs);
            res += tag;
        }
    }
    return [res, docs];
};
SmDocument.prototype.export = function(){
    let docs = [this.root], res = [];
    while (docs.length)
    {
        let doc = docs.shift(), exported;
        [exported, docs] = this.exportList(doc.children, docs);
        res.push([doc.attrs.id, exported]);
    }
    return res;
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

class NodeRenderer extends React.Component {
    render(){
        let {node, path} = this.props;
        let Tag = node.type;
        return <Tag data-sm-path={path}>
            <NodeListRenderer nodes={node.children} prefix={path+'.'}/>
        </Tag>;
    }
}

class NodeListRenderer extends React.Component {
    render(){
        let {nodes, prefix} = this.props;
        return _.map(nodes, (node, k)=>{
            switch (node.type)
            {
                case 'text':
                    return node.text;
                default:
                    return <NodeRenderer key={k} node={node} path={prefix+k}/>;
            }
        });
    }
}

class SmPath extends React.Component {
    render(){
        let nodes = this.props.document.getPathByCoord();
        nodes = nodes.map(node=>node.type).reduce((acc, el)=>acc.concat(' / ', el), []);
        return <div>{nodes}</div>;
    }
}

class SmEditor extends React.Component {
    constructor(props){
        super(props);
        window.smdoc = this.document = new SmDocument(props.text);
        this.state = {cursorX: 0, cursorY: 0};
    }
    addChar(ch){
        this.document.insertCharAtCursor(ch);
        this.rerender();
    }
    backspace(){
        this.document.removeCharBeforeCursor();
        this.rerender();
    }
    _onElmClick(e){
        e.stopPropagation();
        let {startContainer: elm, startOffset: offset}
            = document.caretRangeFromPoint(e.clientX, e.clientY);
        let coord = String($(elm.parentNode).data('sm-path')).split('.');
        coord.push(Array.prototype.indexOf.call(elm.parentNode.childNodes, elm));
        coord.push(offset);
        this.document.setCursor(coord);
        this.rerender();
    }
    _onKeyUp(e){
        e.preventDefault();
        console.log('up', _.pick(e, kn));
        switch (e.key){
        case 'Backspace':
            this.backspace();
            break;
        }
    }
    _onKeyPress(e){
        console.log('press', _.pick(e, kn));
        this.addChar(e.key);
    }
    async rerender(){
        // first rerender doc then call range.getBoundingClientRect
        await postpone(()=>this.forceUpdate());
        let node = this.ref, c = this.document.coord, offset = c[c.length-1];
        for (let i = 0; i < c.length-1; i++)
            node = node.childNodes[c[i]];
        let range = document.createRange();
        range.setStart(node, offset);
        range.setEnd(node, offset);
        let rect = range.getBoundingClientRect();
        let rectContainer = this.ref.getBoundingClientRect();
        let cursorX = rect.x - rectContainer.x;
        let cursorY = rect.y - rectContainer.y;
        this.setState({cursorX, cursorY});
    }
    render(){
        return <div className="sm-editor">
            <SmPath document={this.document}/>
            <div className="sm-text">
                <div tabIndex="0" ref={e=>this.ref = e}
                    onClick={e=>this._onElmClick(e)}
                    onKeyPress={e=>this._onKeyPress(e)}
                    onKeyUp={e=>this._onKeyUp(e)}>
                    <NodeListRenderer nodes={this.document.getNodes()} prefix={''}/>
                </div>
                <SmCursor x={this.state.cursorX} y={this.state.cursorY}/>
            </div>
        </div>;
    }
}

export {SmEditor, SmDocument, SmParser}
