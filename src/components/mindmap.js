import React from 'react'
import $ from 'jquery'

function mapFields(obj, callback)
{
    var res = [];
    for (var i in obj) {
        if (obj.hasOwnProperty(i)) {
            res.push(callback(obj[i], i));
        }
    }
    return res;
}function sumRelativeOffset(elem, initial)
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
    render: function() {
        var {link} = this.props;
        var title = link.item.title;
        var className = 'item item' + link.item.id + ' panel panel-default';
        return (
            <div data-id={link.item.id}
                 className={className}
                 style={{left: link.x, top: link.y}}
            >
                <div className="panel-heading">
                    <span className="glyphicon glyphicon-move" />
                    <span onClick={() => this.props.onGotoItem(link.item.id)}
                          className="open-item-map glyphicon glyphicon-eye-open" />
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
    render: function() {
        if (!this.props.item.id) {
            return false;
        }

        return <div className="tab-pane active" id="map">
            {mapFields(
                this.props.links,
                (link) => <MindmapItem
                        key={link.item.id}
                        link={link}
                        onGotoItem={this.gotoItem}
                        onUnlink={this.unlink} />
            )}
        </div>;
    }
});

export {ItemMap}
