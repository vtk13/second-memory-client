import React from 'react'
import ReactDOM from 'react-dom'
import $ from 'jquery'
import {SmTextInput} from './elements'
import vis from 'vis'

function mapFields(obj, callback)
{
    let res = [];
    for (let i in obj) {
        if (obj.hasOwnProperty(i)) {
            res.push(callback(obj[i], i));
        }
    }
    return res;
}

function sumRelativeOffset(elem, initial)
{
    initial = initial || {top: 0, left: 0};

    let res = {
        top: initial.top + elem.offsetTop,
        left: initial.left + elem.offsetLeft
    };

    return elem.offsetParent ? sumRelativeOffset(elem.offsetParent, res) : res;
}

function getCoords(elem) {
    let box = elem.getBoundingClientRect();
    let rel = sumRelativeOffset(elem.offsetParent, {top: -31, left: 0});

    return {
        top: box.top + pageYOffset - rel.top,
        left: box.left + pageXOffset - rel.left
    };
}

function wordwrap(str, int_width, str_break, cut) {
    // Wraps a string to a given number of characters
    //
    // +   original by: Jonas Raoni Soares Silva (http://www.jsfromhell.com)
    // +   improved by: Nick Callen

    let i, j, s, r = str.split("\n");
    if(int_width > 0) for(i in r){
        for(s = r[i], r[i] = ""; s.length > int_width;
            j = cut ? int_width : (j = s.substr(0, int_width).match(/\S*$/)).input.length - j[0].length || int_width,
                r[i] += s.substr(0, j) + ((s = s.substr(j)).length ? str_break : "")
        );
        r[i] += s;
    }
    return r.join("\n");
}

$('body').on('mousedown', '#map .item .glyphicon-move', function({originalEvent}) {
    let item = $(this).parents('.item').addClass('dragging').get(0);
    let e = originalEvent;

    let coords = getCoords(item);
    let shiftX = e.pageX - coords.left;
    let shiftY = e.pageY - coords.top;

    moveAt(e);

    function moveAt(e) {
        item.style.left = ((e.pageX - shiftX) - (e.pageX - shiftX) % 5) + 'px';
        item.style.top = ((e.pageY - shiftY) - (e.pageY - shiftY) % 5) + 'px';
    }

    document.onmousemove = function (e) {
        moveAt(e);
    };

    item.onmouseup = function() {
        store.dispatch({
            type: 'SET_ITEM_XY',
            id: $(this).data('id'),
            x: Number.parseInt(item.style.left),
            y: Number.parseInt(item.style.top)
        });
        document.onmousemove = null;
        item.onmouseup = null;
        $(item).removeClass('dragging');
    };
}).on('dragstart', '#map .item .glyphicon-move', function() { return false; });

class MindmapItem extends React.Component{
    constructor(props){
        super(props);
        this.state = {id: props.link.item.id, title: props.link.item.title, readonly: true};
    }
    handleEdit(){
        this.setState({
            id: this.state.id,
            title: this.state.title,
            readonly: false
        });
    }
    handleSubmit(e){
        e.preventDefault();
        this.setState({
            id: this.state.id,
            title: this.state.title,
            readonly: true
        });
        this.props.onSubmit(this.state.id, this.state.title)
    }
    componentDidUpdate(){
        if (!this.state.readonly && this.state.input) {
            let node = ReactDOM.findDOMNode(this.state.input);
            node.focus();
            node.selectionStart = node.selectionEnd = node.value.length;
        }
    }
    render(){
        let {link} = this.props;
        let className = 'item item' + link.item.id + ' item-type' + link.item.type + ' panel panel-default';

        let title, editBtn;
        if (this.state.readonly) {
            title = this.state.title;
            editBtn = <span title="Edit title" onClick={this.handleEdit}
                className="open-item-map glyphicon glyphicon-edit"/>;
        } else {
            title = <form onSubmit={this.handleSubmit}>
                    <SmTextInput ref={input=>this.setState({input})}
                        name="title" value={this.state.title}
                        onChange={value=>this.setState({title: value})}/>
                </form>;
            editBtn = '';
        }

        return (
            <div data-id={link.item.id}
                 className={className}
                 style={{left: link.x, top: link.y}}
            >
                <div className="panel-heading">
                    <span title="Move element" className="glyphicon glyphicon-move" />
                    <span title="Go to this item's map"
                          onClick={()=>this.props.onGotoItem(link.item.id)}
                          className="open-item-map glyphicon glyphicon-eye-open" />
                    {editBtn}
                    <span title="Unlink from this map"
                          onClick={()=>this.props.onUnlink(link.item.id)}
                          className="glyphicon glyphicon-remove" />
                </div>
                <div className="panel-body">{title}</div>
            </div>
        );
    }
}

class ItemMap extends React.Component{
    gotoItem(id){
        this.props.store.dispatch({type: 'LOAD_ITEM', id: id, mode: 'map'});
    }
    unlink(id){
        if (confirm('Really unlink?')) {
            this.props.store.dispatch({type: 'UNLINK_ITEM', id: id});
        }
    }
    handleSubmit(id, title){
        this.props.store.dispatch({type: 'UPDATE_LINK_TITLE', id: id, title: title});
    }
    handleDoubleClick(e){
        let title = prompt('Title');
        let coords = document.getElementById('map').getBoundingClientRect();
        if (title !== null) {
            this.props.store.dispatch({
                type: 'CREATE_AND_LINK_ITEM',
                title: title,
                x: e.clientX - coords.left,
                y: e.clientY - coords.top
            });
        }
    }
    render(){
        if (!this.props.item.id) {
            return false;
        }

        return <div className="tab-pane active" id="map" onDoubleClick={e=>this.handleDoubleClick(e)}>
            {_.values(this.props.links).filter(link=>link.type_id==0).map(link =>
                <MindmapItem
                    onSubmit={(id, title)=>this.handleSubmit(id, title)}
                    key={link.item.id}
                    link={link}
                    onGotoItem={id=>this.gotoItem(id)}
                    onUnlink={this.unlink} />
            )}
        </div>;
    }
}

class ItemGraph extends React.Component{
    componentDidUpdate(){
        let {item, links} = this.props;

        let nodes = new vis.DataSet([{id: item.id, label: wordwrap(item.title, 25, '\n'), shape: 'box'}]);
        let edges = new vis.DataSet([]);

        for (let i in links) {
            nodes.add({id: links[i].item.id, label: wordwrap(links[i].item.title, 25, '\n'), shape: 'box'});
            let from = Math.min(item.id, links[i].item.id), to = Math.max(item.id, links[i].item.id);
            edges.add({id: from + ':' + to, from, to});
        }

        let network = new vis.Network(
            document.getElementById('mynetwork'),
            {nodes, edges},
            {
                layout: {
                    hierarchical: {
                        direction: 'LR',
                        sortMethod: 'directed',
                        levelSeparation: 200
                    }
                },
                physics: {
                    enabled: false
                }
            }
        );
        // hack hack
        window.network = network;
        network.on('click', function (params) {
            if (params.nodes.length > 0) {
                let id = params.nodes[0];

                window.client.default.get_items_id_links(
                    {id},
                    function(res) {
                        res.obj.map(function(link) {
                            client.default.get_items_id({id: link.right}, function (res) {
                                let item = res.obj;
                                nodes.update({id: item.id, label: wordwrap(item.title, 25, '\n'), shape: 'box'});
                                let from = Math.min(id, item.id), to = Math.max(id, item.id);
                                edges.update({id: from + ':' + to, from, to});
                            });
                        });
                    }
                );
            }
        });
    }
    render(){
        return <div id="mynetwork"
            style={{width: '100%', height: 500, border: 'solid 1px gray'}}/>;
    }
}

export {ItemMap, ItemGraph}
