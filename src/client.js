import Swagger from 'swagger-client';
import $ from 'jquery';
import bootstap from 'bootstrap';
import { createStore } from 'redux';
import React from 'react';
import ReactDOM from 'react-dom';

import url from './url';

window.client = new Swagger({
    url: '/swagger-api.yml',
    success: function() {
        store.dispatch({type: 'INIT'});
    },
    authorizations: {
        easyapi_basic: new Swagger.PasswordAuthorization(BASIC_SERVER_USER, BASIC_SERVER_PASSWORD)
    },
    enableCookies: true
});
//*/

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

function setDragaable(item)
{
    item.onmousedown = function (e) {

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

        item.onmouseup = function () {
            document.onmousemove = null;
            item.onmouseup = null;
        };

    };

    item.ondragstart = function () {
        return false;
    };
}

function saveItem(item, success)
{
    if (item.id) {
        client.default.put_items_id(item, function(res) {
            success(res.obj.item);
        });
    } else {
        client.default.post_items(item, function(res) {
            success(res.obj.item);
        });
    }
}

function counter(state, action) {
    state = state || {
        inProgress: false,
        canRepeat: false,
        currentItem: null,
        currentItemLinks: [],
        currentItemMode: 'preview'
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
                    store.dispatch({type: 'SET_ITEM', item: res.obj.items});
                }
            });
            break;
        case 'RESET_ITEM':
            state.currentItem = null;
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
            url.setItemId(0);
            document.title = 'Create Item - Second Memory';
            state.currentItemMode = 'edit';
            break;
        case 'SAVE_CURRENT_ITEM':
            state.currentItem.text = action.text;
            state.currentItem.href = action.href;
            state.inProgress = true;
            saveItem(state.currentItem, function(savedItem) {
                store.dispatch({type: 'UPDATE_ITEM', item: savedItem});
            });
            break;
        case 'LINK_ITEM':
            state.currentItemLinks.push({item: action.item, x: 0, y: 0});
            state.currentItemMode = 'map';
            break;
        case 'SET_ITEM':
            state.currentItemMode = 'preview';
            // no break
        case 'UPDATE_ITEM':
            state.canRepeat = action.canRepeat || false;
            state.currentItem = action.item || state.currentItem;
            url.setItemId(state.currentItem.id);
            document.title = state.currentItem.text ? state.currentItem.text.split('\n')[0] : 'Second Memory';
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
                    store.dispatch({type: 'SET_ITEM', item: res.obj.item, canRepeat: true});
                }
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
        case 'REPEATED':
            state.inProgress = true;
            client.default.put_items_id_repeat({id: state.currentItem.id}, function(res) {
                store.dispatch({type: 'UPDATE_ITEM'});
            });
            break;
        case 'TOGGLE_LEARNED':
            state.inProgress = true;
            state.currentItem.type = state.currentItem.type == 1 ? 0 : 1;
            saveItem(state.currentItem, function(savedItem) {
                store.dispatch({type: 'UPDATE_ITEM'});
            });
            break;
    }
    return state;
}

window.store = createStore(counter);

function ItemPreview({item})
{
    function RepeatedButton()
    {
        function onClick() {
            store.dispatch({type: 'REPEATED', item: item});
        }

        if (store.getState().canRepeat) {
            return <button type="submit" className="btn btn-primary" onClick={onClick}>Repeated</button>;
        } else {
            return <span />;
        }
    }

    function LearnedButton()
    {
        function onClick() {
            store.dispatch({type: 'TOGGLE_LEARNED'});
        }

        if (!item.id) {
            return <span />;
        }

        if (item.type == 0) {
            return <button type="submit" className="btn btn-primary" onClick={onClick}>Set On Learn</button>;
        } else {

            return <button type="submit" className="btn btn-primary" onClick={onClick}>Set On Repeat</button>;
        }
    }

    return <div className="tab-pane active">
        <div style={{marginBottom: '10px'}}>id: <a href={url.getItemUrl(item.id)}>{item.id}</a></div>
        <pre>{item.text}</pre>
        <RepeatedButton />
        <LearnedButton />
    </div>;
}

function ItemEditor({item})
{
    var text, href;

    function saveItem(e)
    {
        e.preventDefault();
        store.dispatch({type: 'SAVE_CURRENT_ITEM', text: text.value, href: href.value});
    }

    return <div className="tab-pane active">
        <form onSubmit={saveItem}>
            <div className="form-group">
                <label htmlFor="currentItemHref">Href</label>
                <input id="currentItemHref" ref={(c) => href = c} title="href" className="form-control" defaultValue={item.href} />
            </div>
            <div className="form-group">
                <textarea ref={(c) => text = c} title="text" className="form-control" rows="18" defaultValue={item.text}></textarea>
            </div>
            <div className="form-group">
                <button type="submit" className="btn btn-primary">Save</button>
            </div>
        </form>
    </div>;
}

var ItemMap = React.createClass({
    render: function() {
        return <div className="tab-pane active" id="map">
            {this.props.links.map(function(link) {
                var text = link.item.text ? link.item.text.split('\n')[0] : 'empty note';
                var className = 'item item' + link.item.id + ' panel panel-default';
                return <div key={link.item.id} className={className} style={{left: link.x, top: link.y}}>
                    <div className="panel-body">{text}</div>
                </div>;
            })}
        </div>;
    },
    componentDidMount: function() {
        $(this.getDOMNode()).find('.item').each(function() {
            setDragaable(this);
        });
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
    function onPreview() {
        store.dispatch({type: 'SET_ITEM_MODE', mode: 'preview'});
    }
    function onEdit() {
        store.dispatch({type: 'SET_ITEM_MODE', mode: 'edit'});
    }
    function onMap() {
        store.dispatch({type: 'SET_ITEM_MODE', mode: 'map'});
    }

    var menu = [
        {id: 'preview', caption: 'Preview', onClick: onPreview, active: mode == 'preview'},
        {id: 'editor', caption: 'Editor', onClick: onEdit, active: mode == 'edit'},
        {id: 'map', caption: 'Map', onClick: onMap, active: mode == 'map'}
    ];

    function CurrentItemState()
    {
        switch (mode) {
            case 'preview':
                return <ItemPreview item={item} />;
            case 'edit':
                return <ItemEditor item={item} />;
                break;
            case 'map':
                return <ItemMap links={links} />;
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
            res.obj.items.forEach(function(item) {
                var element = $('<li class="list-group-item search-panel-results-item" />');
                element.html(item.text.substring(0, 100)
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

window.onpopstate = function(event) {
    var [userId, itemId] = url.info();
    if (itemId) {
        if (!store.getState().currentItem || store.getState().currentItem.id != itemId) {
            store.dispatch({type: 'LOAD_ITEM', id: itemId});
        }
    }
};
