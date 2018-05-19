/**
 * Tree Module
 *
 * Node {
 *   type: <tag name> | 'text'
 *   text: <string> for text nodes
 *   children: <array> for tag nodes
 * }
 *
 * It is assumed that leaf nodes are text nodes:
 *
 * Coord [child offset, child offset, ..., text offset]
 *
 */

export function createNode(type, children, attrs){
    if (type=='text')
        return {type, text: children||''};
    return {type, attrs: attrs||{}, children: children||[]};
}

export function getNode(root, coord, levelUps = 0){
    let node = root;
    for (let i = 0; i < coord.length - levelUps; i++)
        node = node.children[coord[i]];
    return node;
}

// @return [left, right]
export function getSiblings(root, coord, levelUps = 0){
    let parent = getNode(root, coord, levelUps+1);
    let x = coord[coord.length-1-levelUps];
    return [parent.children[x-1], parent.children[x+1]];
}

// @return [parent, parent of parent, ...]
export function listVertical(root, coord, levelUps = 0){
    let res = [];
    for (let i = 0; i < coord.length - levelUps; i++){
        res.push(getNode(root, coord, i+levelUps));
    }
    return res;
}

// TODO merge any nodes, merge recursive?
export function mergeChildren(node1, node2){
    return node1.children.concat(node2.children).reduce((acc, node)=>{
        if (acc.length && acc[acc.length-1].type=='text' && node.type=='text')
            acc[acc.length-1].text += node.text;
        else
            acc.push(node);
        return acc;
    }, []);
}

export function mergeAt(root, coord){
    let coord0 = coord.slice(0, -2);
    coord0[coord0.length-1]--;
    let parent0 = getNode(root, coord0);
    let parent1 = getNode(root, coord, 2);
    let newCoord = [...coord0, parent0.children.length-1,
        parent0.children[parent0.children.length-1].text.length];
    parent0.children = mergeChildren(parent0, parent1);
    let parentParent = getNode(root, coord, 3);
    parentParent.children.splice(coord[coord.length-3], 1);
    return newCoord;
}


function exportText(node){
    return node.text;
}
function exportTag(node, docs){
    let res;
    if (node.type=='doc')
    {
        res = `<doc id="${node.attrs.id}"></doc>`;
        docs.push(node);
    }
    else
    {
        [res, docs] = exportList(node.children, docs);
        res = '<'+node.type+'>'+res+'</'+node.type+'>';
    }
    return [res, docs];
}
function exportList(list, docs){
    let res = '', tag;
    for (let child of list)
    {
        if (child.type=='text')
            res += exportText(child);
        else
        {
            [tag, docs] = exportTag(child, docs);
            res += tag;
        }
    }
    return [res, docs];
}
export function exportTree(root){
    let docs = [root], res = [];
    while (docs.length)
    {
        let doc = docs.shift(), exported;
        [exported, docs] = exportList(doc.children, docs);
        res.push([doc.attrs.id, exported]);
    }
    return res;
}
