import React from 'react'
import ReactDOM from 'react-dom'
import $ from 'jquery'
import {SmTextInput} from './elements'
import vis from 'vis'

function mapFields(obj, callback)
{
    var res = [];
    for (var i in obj) {
        if (obj.hasOwnProperty(i)) {
            res.push(callback(obj[i], i));
        }
    }
    return res;
}

function sumRelativeOffset(elem, initial)
{
    initial = initial || {top: 0, left: 0};

    var res = {
        top: initial.top + elem.offsetTop,
        left: initial.left + elem.offsetLeft
    };

    return elem.offsetParent ? sumRelativeOffset(elem.offsetParent, res) : res;
}

function getCoords(elem) {
    var box = elem.getBoundingClientRect();
    var rel = sumRelativeOffset(elem.offsetParent, {top: -31, left: 0});

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

    var i, j, s, r = str.split("\n");
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
    var item = $(this).parents('.item').addClass('dragging').get(0);
    var e = originalEvent;

    var coords = getCoords(item);
    var shiftX = e.pageX - coords.left;
    var shiftY = e.pageY - coords.top;

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

var MindmapItem = React.createClass({
    getInitialState: function() {
        return {
            id: this.props.link.item.id,
            title: this.props.link.item.title,
            readonly: true
        }
    },
    handleEdit: function() {
        this.setState({
            id: this.state.id,
            title: this.state.title,
            readonly: false
        });
    },
    handleSubmit: function(e) {
        e.preventDefault();
        this.setState({
            id: this.state.id,
            title: this.state.title,
            readonly: true
        });
        this.props.onSubmit(this.state.id, this.state.title)
    },
    componentDidUpdate: function() {
        if (this.state.input) {
            var node = ReactDOM.findDOMNode(this.state.input);
            node.focus();
            node.selectionStart = node.selectionEnd = node.value.length;
        }
    },
    render: function() {
        var {link} = this.props;
        var className = 'item item' + link.item.id + ' item-type' + link.item.type + ' panel panel-default';

        var title, editBtn;
        if (this.state.readonly) {
            title = this.state.title;
            editBtn = <span title="Edit title" onClick={this.handleEdit} className="open-item-map glyphicon glyphicon-edit" />;
            this.state.input = null;
        } else {
            title = <form onSubmit={this.handleSubmit}>
                    <SmTextInput ref={(input) => this.state.input = input}
                        name="title"
                        onChange={(value) => this.state.title = value}
                        value={this.state.title} />
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
                    <span title="Go to this item's map" onClick={() => this.props.onGotoItem(link.item.id)}
                          className="open-item-map glyphicon glyphicon-eye-open" />
                    {editBtn}
                    <span title="Unlink from this map" onClick={() => this.props.onUnlink(link.item.id)}
                          className="glyphicon glyphicon-remove" />
                </div>
                <div className="panel-body">{title}</div>
            </div>
        );
    }
});

var ItemMap = React.createClass({
    propTypes: {
        store: React.PropTypes.object.isRequired,
        item: React.PropTypes.object.isRequired,
        links: React.PropTypes.any.isRequired
    },
    gotoItem: function(id) {
        this.props.store.dispatch({type: 'LOAD_ITEM', id: id, mode: 'map'});
    },
    unlink: function(id) {
        if (confirm('Really unlink?')) {
            this.props.store.dispatch({type: 'UNLINK_ITEM', id: id});
        }
    },
    handleSubmit: function(id, title) {
        this.props.store.dispatch({type: 'UPDATE_LINK_TITLE', id: id, title: title});
    },
    handleDoubleClick: function(e) {
        var title = prompt('Title');
        var coords = document.getElementById('map').getBoundingClientRect();
        if (title !== null) {
            this.props.store.dispatch({
                type: 'CREATE_AND_LINK_ITEM',
                title: title,
                x: e.clientX - coords.left,
                y: e.clientY - coords.top
            });
        }
    },
    render: function() {
        if (!this.props.item.id) {
            return false;
        }

        return <div className="tab-pane active" id="map" onDoubleClick={this.handleDoubleClick}>
            {_.values(this.props.links).filter(link=>link.type_id==0).map(link =>
                <MindmapItem
                    onSubmit={this.handleSubmit}
                    key={link.item.id}
                    link={link}
                    onGotoItem={this.gotoItem}
                    onUnlink={this.unlink} />
            )}
        </div>;
    }
});

var ItemGraph = React.createClass({
    componentDidUpdate: function() {
        var {item, links} = this.props;

        var nodes = new vis.DataSet([{id: item.id, label: wordwrap(item.title, 25, '\n'), shape: 'box'}]);
        var edges = new vis.DataSet([]);

        for (var i in links) {
            nodes.add({id: links[i].item.id, label: wordwrap(links[i].item.title, 25, '\n'), shape: 'box'});
            var from = Math.min(item.id, links[i].item.id), to = Math.max(item.id, links[i].item.id);
            edges.add({id: from + ':' + to, from, to});
        }

        var network = new vis.Network(
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
                var id = params.nodes[0];

                window.client.default.get_items_id_links(
                    {id},
                    function(res) {
                        res.obj.map(function(link) {
                            client.default.get_items_id({id: link.right}, function (res) {
                                var item = res.obj;
                                nodes.update({id: item.id, label: wordwrap(item.title, 25, '\n'), shape: 'box'});
                                var from = Math.min(id, item.id), to = Math.max(id, item.id);
                                edges.update({id: from + ':' + to, from, to});
                            });
                        });
                    }
                );
            }
        });
    },
    render: function() {
        return <div id="mynetwork" style={{width: '100%', height: 500, border: 'solid 1px gray'}}></div>
    }
});

export {ItemMap, ItemGraph}
