import React from 'react'

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

var MindmapItem = React.createClass({
    render: function() {
        var {link} = this.props;
        var title = link.item.title;
        var className = 'item item' + link.item.id + ' panel panel-default';
        return (
            <div data-id={link.item.id}
                 className={className}
                 style={{left: link.x, top: link.y}}>
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
