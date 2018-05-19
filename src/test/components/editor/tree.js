import {assert} from 'chai'
import {createNode} from 'components/editor/tree'

describe('tree', ()=>{
    describe('createNode', ()=>{
        it('div', ()=>{
            assert.deepEqual(createNode('div'), {type: 'div', children: [], attrs: {}});
        });
        it('text', ()=>{
            assert.deepEqual(createNode('text'), {type: 'text', text: ''});
        });
    });
});
