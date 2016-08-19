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

function countFields(obj)
{
    var res = 0;
    for (var i in obj) {
        res++;
    }
    return res;
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
                title: '',
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
            state.currentItem.title = action.item.title;
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
            document.title = state.currentItem.title;

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

//////////////////////////////////////////////////////////////////////////////////////////////////////
////// REACT COMPONENTS //////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////////

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

var MyInput = React.createClass({
    getInitialState: function() {
        return {value: this.props.value};
    },
    componentWillReceiveProps: function(nextProps) {
        this.setState({value: nextProps.value});
    },
    handleChange: function(e) {
        this.props.onChange(e.target.value);
        this.setState({value: e.target.value});
    },
    render: function() {
        return <input
            title={this.props.name}
            className="form-control"
            value={this.state.value}
            onChange={this.handleChange}
            placeholder={this.props.name} />
    }
});

var MyWysiwyg = React.createClass({
    componentWillReceiveProps: function(nextProps) {
        this.alloyEditor.get('nativeEditor').setData(nextProps.value);
    },
    handleChange: function(e) {
        // strange bug with previous value
        setTimeout(() => {
            var newValue = this.alloyEditor.get('nativeEditor').getData();
            console.log(newValue);
            this.props.onChange(newValue);
        }, 0);
    },
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
        this.alloyEditor.get('nativeEditor').on('change', this.handleChange);
        this.alloyEditor.get('nativeEditor').on('afterCommandExec', this.handleChange);
    },
    render: function() {
        return <textarea
            id="myContentEditable"
            title={this.props.name}
            className="form-control"
            rows="18"
            defaultValue={this.props.value} />;
    }
});

var ItemEditor = React.createClass({
    render: function() {
        var {title, href, text} = this.props.item;

        function saveItemWithType(type) {
            store.dispatch({
                type: 'SAVE_CURRENT_ITEM',
                item: {
                    type: type,
                    text: text,
                    title: title,
                    href: href
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

        return <div className="tab-pane active row">
            <div className="form-group col-xs-6">
                <MyInput name="title" value={title} onChange={(value) => title = value} />
            </div>
            <div className="form-group col-xs-6">
                <MyInput name="href" value={href} onChange={(value) => href = value}/>
            </div>
            <div className="form-group col-xs-12">
                <MyWysiwyg name="text" value={text} onChange={(value) => text = value}/>
            </div>
            <div className="form-group col-xs-12">
                <DeleteButton item={this.props.item}/>
                <SaveButtons item={this.props.item} saveItem={saveItem} saveToLearn={saveToLearn}
                             saveToRepeat={saveToRepeat}/>
                <LearnedButton item={this.props.item}/>
                <RepeatedButton item={this.props.item} />
            </div>
        </div>;
    }
});

import {ItemMap} from './components/mindmap'

function ItemHyperLink({item})
{
    if (item.href) {
        return <a target="_blank" className="pull-right" href={item.href}><img src="/img/hyperlink.png" width="32" /></a>;
    } else {
        return <noscript/>;
    }
}

var CurrentItemState = React.createClass({
    render: function() {
        switch (this.props.mode) {
            case 'edit':
                return <ItemEditor item={this.props.item} />;
            case 'map':
                return <ItemMap store={store} item={this.props.item} links={this.props.links} />;
        }
    }
});

var ItemWorkspace = React.createClass({
    render: function() {
        var {item, links, mode} = this.props;

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

        if (item) {
            return <div>
                <ul className="nav nav-tabs current-item-container-tabs">
                    {menu.map(function(menuItem) {
                        var className = menuItem.active ? 'active' : '';
                        return <li key={menuItem.id} className={className}><a href="#" onClick={menuItem.onClick}>{menuItem.caption}</a></li>
                    })}
                    <ItemHyperLink item={item} />
                </ul>
                <CurrentItemState mode={mode} item={item} links={links} />
            </div>
        } else {
            return <p>No current item selected</p>;
        }
    }
});

////////////////////////////////////////////////////////////////////////////////////////////////
///// Bootstrap ////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////

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
                element.html(item.title
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
