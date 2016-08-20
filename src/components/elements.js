import React from 'react'
import AlloyEditor from 'alloyeditor';

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
    componentWillReceiveProps: function(nextProps) {
        this.alloyEditor.get('nativeEditor').setData(nextProps.value);
    },
    handleChange: function(e) {
        // strange bug with previous value
        setTimeout(() => {
            var newValue = this.alloyEditor.get('nativeEditor').getData();
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

export {SmTextInput, SmWysiwyg}