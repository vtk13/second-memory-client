import $ from 'jquery';
import React from 'react';
import ReactDOM from 'react-dom';
import AlloyEditor from 'alloyeditor';

window.AlloyEditor = AlloyEditor;

var smLinkSelectionTest = function(payload) {
    var nativeEditor = payload.editor.get('nativeEditor');
    var element = nativeEditor.getSelection().getCommonAncestor().$;
    while (element != document.body) {
        if (element.nodeName == 'SMLINK')
            return true;
        element = element.parentNode;
    }
    return false;
};

AlloyEditor.SelectionTest.smlink = smLinkSelectionTest;

var ButtonSmSearch = React.createClass({
    mixins: [AlloyEditor.ButtonStateClasses, AlloyEditor.ButtonActionStyle],

    propTypes: {
        style: React.PropTypes.oneOfType([
            React.PropTypes.object,
            React.PropTypes.string
        ]),
        editor: React.PropTypes.object.isRequired
    },

    statics: {
        key: 'smlink'
    },

    componentWillMount: function() {
        var Lang = AlloyEditor.Lang;
        var style = this.props.style;

        if (Lang.isString(style)) {
            var parts = style.split('.');
            var currentMember = this.props.editor.get('nativeEditor').config;
            var property = parts.shift();

            while (property && Lang.isObject(currentMember) && Lang.isObject(currentMember[property])) {
                currentMember = currentMember[property];
                property = parts.shift();
            }

            if (Lang.isObject(currentMember)) {
                style = currentMember;
            }
        }

        this._style = new CKEDITOR.style(style);
    },

    componentWillUnmount: function() {
        this._style = null;
    },

    getStyle: function() {
        return this._style;
    },

    isActive: function() {
        var editor = this.props.editor.get('nativeEditor');
        return this.getStyle().checkActive(editor.elementPath(), editor);
    },

    getDefaultProps: function() {
        return {
            style: {
                element: 'smlink',
                attributes: {'data-id': 123},
            }
        };
    },

    render: function() {
        var cssClass = 'dropdown open smlink-editor ' + this.getStateClasses();

        // onClick={this.applyStyle}
        return (
            <div className={cssClass} tabIndex={this.props.tabIndex}>
                <div><input type="text" name="search" placeholder="type to search" /></div>
                <ul className="dropdown-menu">
                    <li><a href="#">qwe</a></li>
                    <li><a href="#">asd</a></li>
                    <li><a href="#">Создать новую запись</a></li>
                </ul>
            </div>
        );
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
                    qwe
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