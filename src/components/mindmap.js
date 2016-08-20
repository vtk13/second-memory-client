import React from 'react'
import ReactDOM from 'react-dom'
import $ from 'jquery'
import {SmTextInput} from './elements'

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

$('body').on('mousedown', '#map .item .glyphicon-move', function({originalEvent}) {
    var item = $(this).parents('.item').addClass('dragging').get(0);
    var e = originalEvent;

    var coords = getCoords(item);
    var shiftX = e.pageX - coords.left;
    var shiftY = e.pageY - coords.top;

    moveAt(e);

    function moveAt(e) {
        item.style.left = (e.pageX - shiftX) + 'px';
        item.style.top = (e.pageY - shiftY) + 'px';
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
        var className = 'item item' + link.item.id + ' panel panel-default';

        var title, editBtn;
        if (this.state.readonly) {
            title = this.state.title;
            editBtn = <span onClick={this.handleEdit} className="open-item-map glyphicon glyphicon-edit" />;
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
                    <span className="glyphicon glyphicon-move" />
                    <span onClick={() => this.props.onGotoItem(link.item.id)}
                          className="open-item-map glyphicon glyphicon-eye-open" />
                    {editBtn}
                    <span onClick={() => this.props.onUnlink(link.item.id)}
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
    render: function() {
        if (!this.props.item.id) {
            return false;
        }

        return <div className="tab-pane active" id="map">
            {mapFields(
                this.props.links,
                (link) => <MindmapItem
                        onSubmit={this.handleSubmit}
                        key={link.item.id}
                        link={link}
                        onGotoItem={this.gotoItem}
                        onUnlink={this.unlink} />
            )}
        </div>;
    }
});

export {ItemMap}
