import $ from 'jquery';
import _ from 'lodash';
import React from 'react';
import ReactDOM from 'react-dom';
import AlloyEditor from 'alloyeditor';

window.AlloyEditor = AlloyEditor;

var smLinkSelectionTest = function(payload) {
    var nativeEditor = payload.editor.get('nativeEditor');
    var element = nativeEditor.getSelection().getCommonAncestor().$;
    while (element != document.body) {
        if ($(element).hasClass('smlink'))
            return true;
        element = element.parentNode;
    }
    return false;
};

AlloyEditor.SelectionTest.smlink = smLinkSelectionTest;

var ButtonSmSearch = React.createClass({
    mixins: [AlloyEditor.ButtonStateClasses],

    propTypes: {
        editor: React.PropTypes.object.isRequired
    },

    statics: {
        key: 'smlink'
    },

    getElement: function() {
        let selection = this.props.editor.get('nativeEditor').getSelection();
        var element = selection.getCommonAncestor().$;
        while (element != document.body) {
            if ($(element).hasClass('smlink'))
                return element;
            element = element.parentNode;
        }
        return null;
    },

    componentWillMount: function() {
        let selection = this.props.editor.get('nativeEditor').getSelection();
        let search = selection.getSelectedText();
        this.setState({id: $(this.getElement()).data('sm-id')||0, search, loading: true, results: []});
        this.search(search);
    },

    isActive: function() {
        return this.state.id > 0;
    },

    applyLink: function(id, title) {
        if (AlloyEditor.Lang.isFunction(this.isActive)) {
            var editor = this.props.editor.get('nativeEditor');

            editor.getSelection().lock();

            let style = new CKEDITOR.style({
                element: 'span',
                attributes: {'class': 'smlink', 'data-sm-id': id||this.state.id},
            });
            if (this.isActive(style)) {
                $(this.getElement()).removeAttr('contentEditable');
                editor.removeStyle(style);
            } else {
                editor.applyStyle(style);
                let element = this.getElement();
                if (element && _.isString(title)) {
                    element.innerText = title;
                    var range = new CKEDITOR.dom.range(editor.document);
                    range.selectNodeContents(new CKEDITOR.dom.element(element));
                    editor.getSelection().selectRanges([range]);
                    setTimeout(()=>$(element).attr('contentEditable', 'false'), 10);
                }
            }

            editor.getSelection().unlock();

            editor.fire('actionPerformed', this);
        }
    },

    search: function(string) {
        if (string.length) {
            // TODO: global variable, get_items_search_search copypasted
            window.client.default.get_items_search_search(
                {search: string},
                res=>this.setState(_.assign({}, this.state, {loading: false, results: res.obj}))
            );
        } else {
            this.setState(_.assign({}, this.state, {loading: false, results: []}));
        }
    },

    onType: function(e) {
        this.search(e.target.value);
    },

    createNew: function(title) {
        window.store.dispatch({
            type: 'CREATE_ITEM',
            title,
            callback: item=>this.applyLink(item.id, item.title)
        });
    },

    render: function() {
        var cssClass = 'dropdown open smlink-editor ' + this.getStateClasses();

        var results = this.state.results.map(res=>
            <li key={res.id}><a href="#" onClick={this.applyLink.bind(this, res.id, res.title)}>{res.title}</a></li>
        );
        if (this.state.loading)
            results.unshift(<li key="0"><img src="/img/ajax-loader-small.gif" /></li>);

        if (this.state.id) {
            return <div>
                <button onClick={()=>window.store.dispatch({type: 'LOAD_ITEM', id: this.state.id})}>Open</button>
                <button onClick={()=>this.applyLink()}>Unlink</button>
            </div>;
        } else {
            var input;
            return (
                <div className={cssClass} tabIndex={this.props.tabIndex}>
                    <div>
                        <input type="text" name="search" placeholder="type to search"
                           ref={e=>input=e}
                           defaultValue={this.state.search} onChange={this.onType} />
                    </div>
                    <ul className="dropdown-menu">
                        <li>
                            <button
                                onClick={()=>this.createNew(input.value)}>
                                Создать новую запись
                            </button>
                        </li>
                        {results}
                    </ul>
                </div>
            );
        }
    }
});

AlloyEditor.Buttons[ButtonSmSearch.key] = AlloyEditor.ButtonSmSearch = ButtonSmSearch;

var ButtonSmLink = React.createClass({
    mixins: [AlloyEditor.ButtonKeystroke, AlloyEditor.ButtonStateClasses, AlloyEditor.ButtonCfgProps],
    propTypes: {
        editor: React.PropTypes.object.isRequired,
        label: React.PropTypes.string,
        tabIndex: React.PropTypes.number
    },

    statics: {
        key: 'smsearch'
    },

    getDefaultProps: function() {
        return {
            keystroke: {
                fn: '_requestExclusive'
            }
        };
    },

    isActive: function() {
        // TODO
        return (new CKEDITOR.Link(this.props.editor.get('nativeEditor')).getFromSelection() !== null);
    },

    render: function() {
        var cssClass = 'ae-button ' + this.getStateClasses();

        if (this.props.renderExclusive) {
            var props = this.mergeButtonCfgProps();

            return (
                <AlloyEditor.ButtonSmSearch {...props} />
            );
        } else {
            return (
                <button aria-label={AlloyEditor.Strings.link} className={cssClass} data-type="button-link"
                        onClick={this._requestExclusive} tabIndex={this.props.tabIndex}
                        title={AlloyEditor.Strings.link}>
                    <img src="/favicon.ico" />
                </button>
            );
        }
    },

    _requestExclusive: function() {
        this.props.requestExclusive(ButtonSmLink.key);
    }
});

AlloyEditor.Buttons[ButtonSmLink.key] = AlloyEditor.ButtonSmLink = ButtonSmLink;

export {smLinkSelectionTest, ButtonSmSearch, ButtonSmLink}