import React from 'react'

class SmTextInput extends React.Component {
    constructor(props){
        super(props);
        this.state = {value: props.value};
    }
    componentWillReceiveProps(nextProps){
        this.setState({value: nextProps.value});
    }
    handleChange(value){
        this.props.onChange(value);
        this.setState({value});
    }
    render(){
        return <input title={this.props.name} className="form-control"
            value={this.state.value} placeholder={this.props.name}
            onChange={e=>this.handleChange(e.target.value)} />
    }
}

class SmTextarea extends React.Component {
    constructor(props){
        super(props);
        this.state = {value: props.value};
    }
    componentWillReceiveProps(nextProps){
        if (this.state.value != nextProps.value) {
            this.setState({value: nextProps.value});
        }
    }
    shouldComponentUpdate(){
        return false;
    }
    handleChange(value){
        if (value != this.state.value) {
            this.setState({value});
            this.props.onChange(value);
        }
    }
    render(){
        return <textarea id="myContentEditable" title={this.props.name}
            className="form-control" rows="18" defaultValue={this.state.value}
            onChange={(e)=>this.handleChange(e.target.value)} />;
    }
}

export {SmTextInput, SmTextarea}
