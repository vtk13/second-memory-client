import _ from 'lodash'
import $ from 'jquery'
import React from 'react'
import assert from 'assert'
import {postpone} from '../util/util'
import {parseHtmlTree} from './editor/parser'
import {createNode, getNode, mergeAt} from 'components/editor/tree'

/**
 * Virtual DOM
 *
 * coord: [root's child n, [level x child y]+, text offset]
 */
function SmDocument(text){
    switch (typeof text){
        case 'object':
            this.root = text;
            break;
        case 'string':
            if (!text.length)
                this.root = createNode('doc', [createNode('div', [createNode('text')])]);
            else
            {
                text = _.trim(text);
                if (text[0]!='<')
                    text = `<div>${text}</div>`;
                this.root = parseHtmlTree(text);
            }
            break;
        default:
            throw new Error('invalid SmDocument(str) parameter type');
    }
    this.coord = [0, 0, 0];
}
SmDocument.prototype.traverse = function(cb, node){
    if (!node)
    {
        cb(this.root);
        node = this.root;
    }
    _.map(node.children, child=>{
        cb(child);
        this.traverse(cb, child);
    });
};
SmDocument.prototype.setCursor = function(coord){
    if (!_.isEqual(this.coord, coord.length))
    {
        this.coord = coord;
        return true;
    }
    return false;
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
SmDocument.prototype._splitCoord = function(coord){
    let node = getNode(this.root, coord, 1);
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
SmDocument.prototype._splitChildren = function(coord, leftSubtree){
    let parent = getNode(this.root, coord, 1);
    let node = getNode(this.root, coord);
    let i = parent.children.indexOf(node);
    if (['div', 'p', 'li', 'h1', 'h2', 'h3'].includes(node.type))
    {
        parent.children.splice(i+1, 0, leftSubtree);
        return [...coord.slice(0, -1), i+1];
    }
    else
    {
        let children = [leftSubtree, ...parent.children.splice(i+1)];
        leftSubtree = _.assign({}, parent, {children});
        let newCoord = this._splitChildren(coord.slice(0, -1), leftSubtree);
        return [...newCoord, 0];
    }
};
SmDocument.prototype.splitAt = function(coord){
    let [node, pos] = this._splitCoord(coord);
    let parent = getNode(this.root, coord, 2);
    assert(node.type=='text');
    let leftSubtree = {type: 'text', text: node.text.substr(pos)};
    node.text = node.text.substr(0, pos);
    let newCoord = this._splitChildren(coord.slice(0, -1), leftSubtree);
    return [...newCoord, 0];
};
SmDocument.prototype.splitAtCursor = function(){
    this.coord = this.splitAt(this.coord);
};
SmDocument.prototype.removeCharBefore = function(coord){
    let [node, pos] = this._splitCoord(coord);
    // in text
    if (pos>0)
    {
        node.text = [node.text.slice(0, pos-1), node.text.slice(pos)].join('');
        return coord.slice(0, -1).concat(pos-1);
    }
    // beginning of block
    return mergeAt(this.root, coord);
};
SmDocument.prototype.removeCharBeforeCursor = function(){
    this.coord = this.removeCharBefore(this.coord);
};

// let kn = ['altKey', 'charCode', 'ctrlKey', 'key', 'keyCode', 'locale', 'location', 'metaKey', 'repeat', 'shiftKey', 'which'];
let kn = ['key'];

class NodeRenderer extends React.Component {
    render(){
        let {node, path} = this.props;
        let Tag = node.type == 'doc' ? 'div' : node.type;
        let className = node.type == 'doc' ? 'doc' : '';
        if (Tag=='img')
            return <Tag src={node.attrs.src}/>
        return <Tag className={className} data-sm-path={path}>
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

class SmActions extends React.Component {
    render(){
        return <div><button>B</button></div>;
    }
}

class SmEditor extends React.Component {
    constructor(props){
        super(props);
        window.smdoc = this.document = new SmDocument(props.text);
        this.state = {};
    }
    componentWillReceiveProps(props){
        // optimize?
        window.smdoc = this.document = new SmDocument(props.text);
    }
    addChar(ch){
        this.dom2docSelectionSync();
        this.document.insertCharAtCursor(ch);
        return this.updateSelection();
    }
    enter(){
        this.dom2docSelectionSync();
        this.document.splitAtCursor();
        return this.updateSelection();
    }
    backspace(){
        this.dom2docSelectionSync();
        this.document.removeCharBeforeCursor();
        return this.updateSelection();
    }
    dom2docSelectionSync(){
        let {anchorNode: elm, anchorOffset: offset} = window.getSelection();
        let coord;
        if (!elm || !this.ref.contains(elm))
            return false;
        if (elm.nodeType == Node.TEXT_NODE)
        {
            coord = String($(elm.parentNode).data('sm-path')).split('.');
            coord.push(Array.prototype.indexOf.call(elm.parentNode.childNodes, elm));
            coord.push(offset);
        }
        else
        {
            coord = String($(elm).data('sm-path')).split('.');
            coord.push(0);
            coord.push(0);
        }
        this.document.setCursor(coord);
        return true;
    }
    _onKeyDown(e){
        console.log('down', _.pick(e, kn));
        switch (e.key){
        case 'Enter':
            e.preventDefault();
            this.enter();
            break;
        case 'Backspace':
            e.preventDefault();
            this.backspace();
            break;
        }
    }
    _onKeyUp(e){
        console.log('up', _.pick(e, kn));
        if (this.dom2docSelectionSync())
            this.forceUpdate();
    }
    _onKeyPress(e){
        e.preventDefault();
        console.log('press', _.pick(e, kn));
        this.addChar(e.key);
    }
    _onMouseUp(e){
        console.log('mouse up');
        if (this.dom2docSelectionSync())
            this.forceUpdate();
    }
    async updateSelection(){
        await postpone(()=>this.forceUpdate());
        let node = this.ref, c = this.document.coord, offset = c[c.length-1];
        for (let i = 0; i < c.length-1; i++)
            node = node.childNodes[c[i]];
        let range = document.createRange();
        range.setStart(node, offset);
        range.collapse(true);
        let sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
    }
    render(){
        return <div className="sm-editor">
            <SmPath document={this.document}/>
            <SmActions document={this.document}/>
            <div className="sm-text" ref={e=>this.ref = e}
                    contentEditable={true} suppressContentEditableWarning={true}
                    onMouseUp={e=>this._onMouseUp(e)}
                    onKeyPress={e=>this._onKeyPress(e)}
                    onKeyUp={e=>this._onKeyUp(e)} onKeyDown={e=>this._onKeyDown(e)}>
                <NodeListRenderer nodes={this.document.getNodes()} prefix={''}/>
            </div>
        </div>;
    }
}

export {SmEditor, SmDocument}
