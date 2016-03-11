import React, {Component, PropTypes} from 'react';
export default WrappedComponent => class extends Component {
    constructor(props) {
        super(props);
    }
    
    shouldComponentUpdate() {
        
    }
    
    componentDidMount() {
        
    }
    
    componentDidUpdate() {
        
    }
    
    componentWillReceiveProps() {
        
    }
    
    render() {
        return (
            <div>
                <WrappedComponent />
            </div>
        )
    }
    
}