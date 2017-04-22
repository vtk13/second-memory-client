import React from 'react'
import AlloyEditor from 'alloyeditor';
import plugins from './alloy';

var SmTextInput = React.createClass({
    propTypes: {
        name: React.PropTypes.string.isRequired,
        value: React.PropTypes.string,
        onChange: React.PropTypes.func.isRequired
    },
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

var SmWysiwyg = React.createClass({
    propTypes: {
        name: React.PropTypes.string.isRequired,
        value: React.PropTypes.string,
        onChange: React.PropTypes.func.isRequired
    },
    getInitialState: function() {
        return {value: this.props.value};
    },
    componentWillReceiveProps: function(nextProps) {
        if (this.state.value != nextProps.value) {
            this.setState({value: nextProps.value});
            this.alloyEditor.get('nativeEditor').setData(nextProps.value);
        }
    },
    shouldComponentUpdate: function() {
        return false;
    },
    handleChange: function(e) {
        // strange bug: without setTimeout getData return previous data, but not actual
        setTimeout(() => {
            var newValue = this.alloyEditor.get('nativeEditor').getData();
            if (newValue != this.state.value) {
                this.state.value = newValue;
                this.props.onChange(newValue);
            }
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

        for (let i = 0; i < AlloyEditor.Selections.length; i++) {
            let selection = AlloyEditor.Selections[i];

            if (selection.name === 'table') {
                selection.buttons.unshift({
                    name: 'styles',
                    cfg: {
                        styles: tableStyles
                    }
                });
            }

            if (selection.name === 'text') {
                selection.buttons.push(AlloyEditor.ButtonSmLink.key);
            }
        }

        var toolbars = {
            add: {
                buttons: ['image', 'embed', 'camera', 'hline', 'table', AlloyEditor.ButtonSmLink.key],
                tabIndex: 2
            },
            styles: {
                selections: AlloyEditor.Selections,
                tabIndex: 1
            }
        };

        toolbars.styles.selections.unshift({
            name: 'smlink',
            buttons: [AlloyEditor.ButtonSmSearch.key],
            test: AlloyEditor.SelectionTest.smlink
        });

        this.alloyEditor = AlloyEditor.editable('myContentEditable', {toolbars});
        this.alloyEditor.get('nativeEditor').on('change', this.handleChange);
        this.alloyEditor.get('nativeEditor').on('afterCommandExec', this.handleChange);
        this.alloyEditor.get('nativeEditor').on('actionPerformed', this.handleChange);
    },
    render: function() {
        return <textarea
            id="myContentEditable"
            title={this.props.name}
            className="form-control"
            rows="18"
            defaultValue={this.state.value} />;
    }
});

export {SmTextInput, SmWysiwyg}