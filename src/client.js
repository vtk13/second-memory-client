import Swagger from 'swagger-client';
import $ from 'jquery';
import bootstap from 'bootstrap';
import { createStore } from 'redux';
import React from 'react';
import ReactDOM from 'react-dom';

window.client = new Swagger({
    url: '/swagger-api.yml',
    success: function() {
        var userId = Number.parseInt(location.pathname.slice(1));
        if (isNaN(userId)) {
            $('body').text('Забыл userId: http://' + location.host + '/{userId}');
        } else {
            client.default.post_users_auth({id: userId});
        }
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

var items = document.getElementsByClassName('item');
for (var i in items) {
    if (items[i] instanceof HTMLElement) {
        setDragaable(items[i]);
    }
}

// */

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
        currentItemMode: 'preview'
    };

    state.inProgress = false;

    switch (action.type) {
        case 'RESET_ITEM':
            state.currentItem = null;
            break;
        case 'NEW_ITEM':
            state.currentItem = {
                id: null,
                type: 0,
                text: '',
                href: ''
            };
            state.currentItemMode = 'edit';
            break;
        case 'SAVE_CURRENT_ITEM':
            state.currentItem.text = action.text;
            state.inProgress = true;
            saveItem(state.currentItem, function(savedItem) {
                store.dispatch({type: 'UPDATE_ITEM', item: savedItem});
            });
            break;
        case 'SET_ITEM':
            state.currentItemMode = 'preview';
            // no break
        case 'UPDATE_ITEM':
            state.canRepeat = action.canRepeat || false;
            state.currentItem = action.item || state.currentItem;
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
        <pre>{item.text}</pre>
        <RepeatedButton />
        <LearnedButton />
    </div>;
}

function ItemEditor({item})
{
    var input;

    function saveItem(e)
    {
        e.preventDefault();
        store.dispatch({type: 'SAVE_CURRENT_ITEM', text: input.value});
    }

    return <div className="tab-pane active">
        <form onSubmit={saveItem}>
            <div className="form-group">
                <textarea ref={(c) => input = c} title="text" className="form-control" rows="20" defaultValue={item.text}></textarea>
            </div>
            <div className="form-group">
                <button type="submit" className="btn btn-primary">Save</button>
            </div>
        </form>
    </div>;
}

function ItemMap({item})
{
    return <div className="tab-pane active" id="map">
        <div className="item item1 panel panel-default">
            <div className="panel-heading">
                <span className="glyphicon glyphicon-move" />
                <span className="glyphicon glyphicon-edit pull-right" />
            </div>
            <div className="panel-body">qwe qweq we</div>
        </div>
        <div className="item item2 panel panel-default">
            <div className="panel-body">Элеанор Портер «Поллианна», вышедшей в свет в 1913 году.</div>
        </div>
        <div className="item item3 panel panel-default">
            <div className="panel-body">«Проклятие знания» (англ. Curse of knowledge) — одно из когнитивных
                искажений в мышлении человека (см. их список); термин, предложенный
                психологом Робином Хогартом для обозначения психологического феномена,
                заключающегося в том, что более информированным людям чрезвычайно сложно
                рассматривать какую-либо проблему с точки зрения менее информированных людей.</div>
        </div>
        <div className="item item4 panel panel-default">
            <div className="panel-body">Spaced learning (Обучение с перерывами, устойчивого перевода нет)
                — методика обучения, по которой тема изучается тремя блоками,
                между которыми делается два десятиминутных перерыва для двигательной
                активности. Методика основана на механизме формирования долговременной
                памяти, описанной Дугласом Филдзом в журнале Scientific American.</div>
        </div>
    </div>;
}

function ItemWorkspace({item, mode})
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
                return <ItemMap item={item} />;
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
        <ItemWorkspace item={state.currentItem} mode={state.currentItemMode} />,
        $('.current-item-container').get(0)
    );

    $('.blocker').toggle(state.inProgress);
});

store.dispatch({type: 'NOP'});

$('.search-panel-form').submit(function() {
    client.default.get_items_search_search(
        {search: $('.search-panel-form-input').val()},
        function (res) {
            var list = $('.search-panel-results');
            list.empty();
            res.obj.items.forEach(function(item) {
                var element = $('<li class="list-group-item search-panel-results-item" />');
                element.html(item.text.substring(0, 100) + ' <span class="glyphicon glyphicon-new-window pull-right"></span>');
                list.append(element);
                element.find('.glyphicon-new-window').click(function() {
                    store.dispatch({type: 'SET_ITEM', item: item});
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
