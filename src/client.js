import Swagger from 'swagger-client';
import $ from 'jquery';
import bootstap from 'bootstrap';
import { createStore } from 'redux';
import React from 'react';
import ReactDOM from 'react-dom';
import AlloyEditor from 'alloyeditor';

import url from './url';

var settings = {
    url: '/swagger-api.yml',
    success: function() {
        this.setHost(API_HOST);
        store.dispatch({type: 'INIT'});
    },
    enableCookies: true
};

if (USE_BASIC) {
    settings.authorizations = {
        easyapi_basic: new Swagger.PasswordAuthorization(BASIC_SERVER_USER, BASIC_SERVER_PASSWORD)
    };
}

window.client = new Swagger(settings);
//*/

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

function countFields(obj)
{
    var res = 0;
    for (var i in obj) {
        res++;
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
    var rel = sumRelativeOffset(elem.offsetParent);

    return {
        top: box.top + pageYOffset - rel.top,
        left: box.left + pageXOffset - rel.left
    };
}

function saveItem(item, success)
{
    if (item.id) {
        client.default.put_items_id(item, function(res) {
            success(res.obj);
        });
    } else {
        client.default.post_items(item, function(res) {
            success(res.obj);
        });
    }
}

function counter(state, action) {
    state = state || {
        inProgress: false,
        canRepeat: false,
        currentItem: null,
        currentItemLinks: {},
        currentItemMode: 'edit'
    };

    state.inProgress = false;

    switch (action.type) {
        case 'INIT':
            state.inProgress = true;
            var [userId, itemId] = url.info();
            if (!userId) {
                $('body').text('Забыл userId: http://' + location.host + '/{userId}');
            } else {
                client.default.post_users_auth({id: userId}, function(res) {
                    if (itemId) {
                        store.dispatch({type: 'LOAD_ITEM', id: itemId});
                    } else {
                        store.dispatch({type: 'RESET_ITEM'});
                    }
                });
            }
            break;
        case 'LOAD_ITEM':
            state.inProgress = true;
            client.default.get_items_id({id: action.id}, function(res) {
                if (res.status == 404) {
                    store.dispatch({type: 'RESET_ITEM'});
                } else {
                    store.dispatch({type: 'SET_ITEM', item: res.obj, mode: action.mode});
                }
            });
            break;
        case 'RESET_ITEM':
            state.currentItem = null;
            state.currentItemLinks = [];
            url.setItemId(0);
            document.title = 'Second Memory';
            break;
        case 'NEW_ITEM':
            state.currentItem = {
                id: null,
                type: 0,
                text: '',
                href: ''
            };
            state.currentItemLinks = [];
            url.setItemId(0);
            document.title = 'Create Item - Second Memory';
            state.currentItemMode = 'edit';
            break;
        case 'SAVE_CURRENT_ITEM':
            if (action.item.type !== undefined) {
                state.currentItem.type = action.item.type;
            }
            state.currentItem.text = action.item.text;
            state.currentItem.href = action.item.href;
            state.inProgress = true;
            saveItem(state.currentItem, function(savedItem) {
                store.dispatch({type: 'UPDATE_ITEM', item: savedItem});
            });
            break;
        case 'DELETE_CURRENT_ITEM':
            state.inProgress = true;
            client.default.delete_items_id({id: state.currentItem.id}, function() {
                store.dispatch({type: 'RESET_ITEM'});
            });
            break;
        case 'SET_ITEM_LINKS':
            state.currentItemLinks = action.links;
            break;
        case 'LINK_ITEM':
            if (!state.currentItemLinks[action.item.id]) {
                state.currentItemLinks[action.item.id] = {item: action.item, x: 0, y: 0};
                state.currentItemMode = 'map';
                state.inProgress = true;
                client.default.put_items_id_links(
                    {
                        id: state.currentItem.id,
                        right: action.item.id,
                        type_id: 0,
                        x: 0,
                        y: 0
                    },
                    function() {
                        store.dispatch({type: 'NOP'});
                    }
                );
            }
            break;
        case 'UNLINK_ITEM':
            state.inProgress = true;
            delete state.currentItemLinks[action.id];
            client.default.delete_items_id_links(
                {
                    id: state.currentItem.id,
                    right: action.id
                },
                function() {
                    store.dispatch({type: 'NOP'});
                });
            break;
        case 'SET_ITEM_XY':
            if (state.currentItemLinks[action.id]) {
                state.currentItemLinks[action.id].x = action.x;
                state.currentItemLinks[action.id].y = action.y;
                client.default.put_items_id_links(
                    {
                        id: state.currentItem.id,
                        right: action.id,
                        type_id: 0,
                        x: action.x,
                        y: action.y
                    },
                    function() {
                        store.dispatch({type: 'NOP'});
                    }
                );
            }
            break;
        case 'SET_ITEM':
            state.currentItemMode = action.mode || 'edit';
            // no break
        case 'UPDATE_ITEM':
            state.currentItemMode = action.mode || state.currentItemMode;
            state.canRepeat = action.canRepeat || false;
            state.currentItem = action.item || state.currentItem;
            state.currentItemLinks = [];
            url.setItemId(state.currentItem.id);
            document.title = state.currentItem.text ? state.currentItem.text.split('\n')[0] : 'Second Memory';

            // load links
            state.inProgress = true;
            client.default.get_items_id_links(
                {id: state.currentItem.id},
                function(res) {
                    if (res.obj.length == 0) {
                        store.dispatch({type: 'SET_ITEM_LINKS', links: res.obj});
                    }

                    var n = 0;
                    var links = {};
                    res.obj.map(function(link) {
                        links[link.right] = link;
                    });
                    res.obj.map(function(link) {
                        client.default.get_items_id({id: link.right}, function(res) {
                            n++;
                            var item = res.obj;
                            links[item.id].item = item;

                            if (n == countFields(links)) {
                                store.dispatch({type: 'SET_ITEM_LINKS', links: links});
                            }
                        });
                    });
                }
            );
            break;
        case 'SET_ITEM_MODE':
            state.currentItemMode = action.mode;
            break;
        case 'REPEAT':
            state.inProgress = true;
            client.default.get_items_next_to_repeat({}, function(res) {
                if (res.status == 204) {
                    store.dispatch({type: 'RESET_ITEM'});
                } else {
                    store.dispatch({type: 'SET_ITEM', item: res.obj, canRepeat: true});
                }
            });
            break;
        case 'REPEATED':
            state.inProgress = true;
            client.default.put_items_id_repeat({id: state.currentItem.id}, function(res) {
                store.dispatch({type: 'UPDATE_ITEM', canRepeat: false});
            });
            break;
        case 'LEARN':
            state.inProgress = true;
            client.default.get_items_learn({}, function(res) {
                if (res.status == 204) {
                    store.dispatch({type: 'RESET_ITEM'});
                } else {
                    store.dispatch({type: 'SET_ITEM', item: res.obj});
                }
            });
            break;
        case 'TOGGLE_LEARNED':
            state.inProgress = true;
            state.currentItem.type = state.currentItem.type == 1 ? 0 : 1;
            saveItem(state.currentItem, function(savedItem) {
                store.dispatch({type: 'NOP'});
            });
            break;
    }
    return state;
}

window.store = createStore(counter);

var RepeatedButton = React.createClass({
    render: function() {
        var item = this.props.item;

        function onClick() {
            store.dispatch({type: 'REPEATED', item: item});
        }

        if (store.getState().canRepeat) {
            return <button type="submit" className="btn btn-primary" onClick={onClick}>Repeated</button>;
        } else {
            return false;
        }
    }
});

var LearnedButton = React.createClass({
    render: function() {
        var item = this.props.item;

        function onClick() {
            store.dispatch({type: 'TOGGLE_LEARNED'});
        }

        if (!item.id) {
            return false;
        }

        if (item.type == 0) {
            return <button type="button" className="btn btn-to-learn btn-primary" onClick={onClick}>Set On Learn</button>;
        } else {
            return <button type="button" className="btn btn-to-repeat btn-primary" onClick={onClick}>Set On Repeat</button>;
        }
    }
});

var DeleteButton = React.createClass({
    render: function() {
        var item = this.props.item;

        if (!item.id) {
            return false;
        }

        function deleteItem(e)
        {
            if (confirm('Really delete?')) {
                store.dispatch({type: 'DELETE_CURRENT_ITEM'});
            }
        }

        return <button type="button" onClick={deleteItem} className="btn btn-danger pull-right">Delete</button>;
    }
});

var SaveButtons = React.createClass({
    render: function() {
        var item = this.props.item;

        if (item.id) {
            return <button type="button" onClick={this.props.saveItem} className="btn btn-primary">Save</button>
        } else {
            return <div>
                <button type="button" onClick={this.props.saveToLearn} className="btn btn-primary">Save to learn</button>
                <button type="button" onClick={this.props.saveToRepeat} className="btn btn-primary">Save to repeat</button>
            </div>;
        }
    }
});

var ItemEditor = React.createClass({
    componentDidMount: function() {
        var tableClasses = [
            {
                name: 'Normal Table',
                cssClass: 'table'
            },
            {
                name: 'Striped Rows',
                cssClass: 'table table-striped'
            },
            {
                name: 'Bordered Table',
                cssClass: 'table table-bordered'
            },
            {
                name: 'Hover Rows',
                cssClass: 'table table-hover'
            },
            {
                name: 'Condensed Table',
                cssClass: 'table table-condensed'
            }
        ];

        var tableStyles = tableClasses.map(function(styleDefinition) {
            return {
                name: styleDefinition.name,
                style: {
                    element: 'table',
                    attributes: {
                        'class': styleDefinition.cssClass
                    }
                }
            }
        });

        var tableSelection;

        for (var i = 0; i < AlloyEditor.Selections.length; i++) {
            tableSelection = AlloyEditor.Selections[i];

            if (tableSelection.name === 'table') {
                tableSelection.buttons.unshift({
                    name: 'styles',
                    cfg: {
                        styles: tableStyles
                    }
                });

                break;
            }
        }

        this.alloyEditor = AlloyEditor.editable('myContentEditable');
    },
    render: function() {
        var href, self = this;

        function saveItemWithType(type) {
            store.dispatch({
                type: 'SAVE_CURRENT_ITEM',
                item: {
                    type: type,
                    text: self.alloyEditor.get('nativeEditor').getData(),
                    href: href.value
                }
            });
        }

        function saveItem() {
            saveItemWithType();
        }

        function saveToLearn() {
            saveItemWithType(1);
        }

        function saveToRepeat() {
            saveItemWithType(0);
        }

        return <div className="tab-pane active">
            <div className="form-group">
                <label htmlFor="currentItemHref">Href</label>
                <input id="currentItemHref" ref={(c) => href = c} title="href" className="form-control"
                       defaultValue={this.props.item.href}/>
            </div>
            <div className="form-group">
                <textarea id="myContentEditable" title="text" className="form-control" rows="18"
                          defaultValue={this.props.item.text}></textarea>
            </div>
            <div className="form-group">
                <DeleteButton item={this.props.item}/>
                <SaveButtons item={this.props.item} saveItem={saveItem} saveToLearn={saveToLearn}
                             saveToRepeat={saveToRepeat}/>
                <LearnedButton item={this.props.item}/>
                <RepeatedButton item={this.props.item} />
            </div>
        </div>;
    }
});

var ItemMap = React.createClass({
    render: function() {
        if (!this.props.item.id) {
            return false;
        }

        function gotoItem(id)
        {
            store.dispatch({type: 'LOAD_ITEM', id: id, mode: 'map'});
        }

        function unlink(id)
        {
            if (confirm('Really unlink?')) {
                store.dispatch({type: 'UNLINK_ITEM', id: id});
            }
        }

        return <div className="tab-pane active" id="map">
            {mapFields(
                this.props.links,
                function (link) {
                    var text = link.item.text.split('\n')[0];
                    var className = 'item item' + link.item.id + ' panel panel-default';
                    return <div data-id={link.item.id} key={link.item.id} className={className}
                                style={{left: link.x, top: link.y}}>
                        <div className="panel-heading">
                            <span className="glyphicon glyphicon-move"></span>
                            <span onClick={() => gotoItem(link.item.id)} className="open-item-map glyphicon glyphicon-eye-open"></span>
                            <span onClick={() => unlink(link.item.id)} className="glyphicon glyphicon-remove"></span>
                        </div>
                        <div className="panel-body">{text}</div>
                    </div>;
                }
            )}
        </div>;
    }
});

function ItemHyperLink({item})
{
    if (item.href) {
        return <a target="_blank" className="pull-right" href={item.href}><img src="/img/hyperlink.png" width="32" /></a>;
    } else {
        return <noscript/>;
    }
}

function ItemWorkspace({item, links, mode})
{
    function onEdit() {
        store.dispatch({type: 'SET_ITEM_MODE', mode: 'edit'});
    }
    function onMap() {
        store.dispatch({type: 'SET_ITEM_MODE', mode: 'map'});
    }

    var menu = [
        {id: 'editor', caption: 'Editor', onClick: onEdit, active: mode == 'edit'}
    ];
    if (item && item.id) {
        menu.push({id: 'map', caption: 'Map', onClick: onMap, active: mode == 'map'});
    }

    function CurrentItemState()
    {
        switch (mode) {
            case 'edit':
                return <ItemEditor item={item} />;
                break;
            case 'map':
                return <ItemMap item={item} links={links} />;
                break;
        }
    }

    if (item) {
        return <div>
            <ul className="nav nav-tabs current-item-container-tabs">
                {menu.map(function(menuItem) {
                    var className = menuItem.active ? 'active' : '';
                    return <li key={menuItem.id} className={className}><a href="#" onClick={menuItem.onClick}>{menuItem.caption}</a></li>
                })}
                <ItemHyperLink item={item} />
            </ul>
            <CurrentItemState />
        </div>
    } else {
        return <p>No current item selected</p>;
    }
}

store.subscribe(function() {
    var state = store.getState();
    // подписаться нужно внутри компонента, и не вызывать ReactDOM.render каждый раз
    ReactDOM.render(
        <ItemWorkspace item={state.currentItem} links={state.currentItemLinks} mode={state.currentItemMode} />,
        $('.current-item-container').get(0)
    );

    $('.blocker').toggle(state.inProgress);
});

$('.search-panel-form').submit(function() {
    client.default.get_items_search_search(
        {search: $('.search-panel-form-input').val()},
        function (res) {
            var list = $('.search-panel-results');
            list.empty();
            res.obj.forEach(function(item) {
                var element = $('<li class="list-group-item search-panel-results-item" />');
                element.html(item.text.split('\n')[0]
                    + ' <span class="glyphicon glyphicon-new-window pull-right"></span>'
                    + ' <span class="glyphicon glyphicon-import pull-right"></span>'
                );
                list.append(element);
                element.find('.glyphicon-new-window').click(function() {
                    store.dispatch({type: 'SET_ITEM', item: item});
                });
                element.find('.glyphicon-import').click(function() {
                    store.dispatch({type: 'LINK_ITEM', item: item});
                });
            });
        }
    );
    return false;
});

$('.main-menu-new-item').click(function() {
    store.dispatch({type: 'NEW_ITEM'});
    return false;
});

$('.main-menu-repeat').click(function() {
    store.dispatch({type: 'REPEAT'});
    return false;
});

$('.main-menu-learn').click(function() {
    store.dispatch({type: 'LEARN'});
    return false;
});

$('body').on('mousedown', '#map .item .glyphicon-move', function({originalEvent}) {
    var item = $(this).parents('.item').get(0);
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
    };
}).on('dragstart', '#map .item .glyphicon-move', function() { return false; });

window.onpopstate = function(event) {
    var [userId, itemId] = url.info();
    if (itemId) {
        if (!store.getState().currentItem || store.getState().currentItem.id != itemId) {
            store.dispatch({type: 'LOAD_ITEM', id: itemId});
        }
    }
};
