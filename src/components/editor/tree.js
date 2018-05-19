/**
 * Tree Module
 *
 * Node {
 *   type: <tag name> | 'text'
 *   text: <string> for text nodes
 *   children: <array> for tag nodes
 * }
 *
 */

export function createNode(type, children, attrs){
    if (type=='text')
        return {type, text: children||''};
    return {type, attrs: attrs||{}, children: children||[]};
}
