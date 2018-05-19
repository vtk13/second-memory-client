/**
 * Sm Html parser
 *
 * Usually functions return [ok, res, pos]
 *   - ok: true/false
 *   - res: response payload or error message
 *   - pos: new cursor position after parsing chunk
 *
 */

function err(str, type, expected, pos, actual){
    if (actual===undefined)
    {
        let {min, max} = Math, l = str.length;
        actual = [str.slice(max(pos-5, 0), max(pos, 0)),
            '[', str[pos], ']',
            str.slice(min(pos+1, l), min(pos+6, l))].join('');
    }
    return new Error(`Expected ${type} ${JSON.stringify(expected)}, `
        +`${JSON.stringify(actual)} given at pos ${pos}`);
}

function readChar(str, pos, match){
    if (pos>=str.length)
        return [false, 'at the end', pos];
    let ch = str[pos];
    if (match===undefined)
        return [true, ch, pos+1];
    if (match.test)
        return match.test(ch) ? [true, ch, pos+1] : [false, 'unmatched re', pos];
    return ch===match ? [true, ch, pos+1] : [false, 'unmatched ch', pos];
}

function readSeq(str, pos, match){
    let ok, ch, res = '';
    while (true){
        [ok, ch, pos] = readChar(str, pos, match);
        if (!ok)
            break;
        res += ch;
    }
    return [true, res, pos];
}

function matchString(str, pos, match){
    let ok, res, _pos = pos, chunk = '';
    do {
        [ok, res, _pos] = readChar(str, _pos);
        if (!ok)
            return [false, res, pos];
        chunk += res;
        if (match===chunk)
            return [true, chunk, _pos];
        if (chunk.length>=match.length)
            return [false, 'unmatched', pos];
    } while (true);
}

function readWord(str, pos){
    let word;
    // TODO: first letter can't be digit
    [, word, pos] = readSeq(str, pos, /[a-zA-Z0-9_-]/);
    return word.length ? [true, word, pos] : [false, 'not a word', pos];
}

function readText(str, pos){
    let ok, ch, text = '', re = /[^<]/;
    do {
        [ok, ch, pos] = readChar(str, pos, re);
        if (!ok)
            break;
        text += ch;
    } while (true);
    return text.length ? [true, text, pos] : [false, 'not a text', pos];
}

function readChildren(str, pos){
    let ok, res, _pos, children = [];
    do {
        [ok, res, _pos] = readText(str, pos);
        if (ok)
        {
            pos = _pos;
            children.push({type: 'text', text: res});
            continue;
        }
        [ok, res, _pos] = readTag(str, pos);
        if (ok)
        {
            pos = _pos;
            children.push(res);
            continue;
        }
        else if (res!='not a tag')
            return [false, res, _pos];
        break;
    } while (true);
    return [true, children, pos];
}

function readAttributes(str, pos){
    [, , pos] = readSeq(str, pos, /\s/);
    let res = {}, ok, name, val;
    while (!readChar(str, pos, '>')[0])
    {
        [ok, name, pos] = readWord(str, pos);
        if (!ok)
            return [false, 'invalid attr name', pos];
        [ok, , pos] = readChar(str, pos, '=');
        if (!ok)
            return [false, '= expected', pos];
        [ok, , pos] = readChar(str, pos, '"');
        if (!ok)
            return [false, '" expected', pos];
        [, val, pos] = readSeq(str, pos, /[^"]/);
        [ok, , pos] = readChar(str, pos, '"');
        if (!ok)
            return [false, '" expected', pos];
        if (res[name])
            return [false, `attribute '${name}' duplication`, pos];
        [, , pos] = readSeq(str, pos, /\s/);
        res[name] = val;
        [ok, , ] = readChar(str, pos, '/');
        if (ok)
            break;
    }
    return [true, res, pos];
}

function readTag(str, pos){
    let ok, _pos, tag = {};
    [, , pos] = readSeq(str, pos, /\s/);
    [ok, , _pos] = readChar(str, pos, '<');
    if (!ok)
        return [false, 'not a tag', pos];
    [ok, tag.type, _pos] = readWord(str, _pos);
    if (!ok)
        return [false, 'not a tag', pos];
    pos = _pos;
    if (!['div', 'p', 'b', 'doc', 'ul', 'li', 'span', 'code', 'pre',
        'h1', 'h2', 'h3', 'img', 'a'].includes(tag.type))
    {
        throw err(str, 'tag name', 'div, b, doc', pos);
    }
    [ok, tag.attrs, pos] = readAttributes(str, pos);
    if (!ok)
        return [false, tag.attrs, pos];
    [ok, , _pos] = readChar(str, pos, '/');
    if (ok)
    {
        [ok, , pos] = readChar(str, _pos, '>');
        if (!ok)
            throw err(str, 'tag closing', '>', pos);
        tag.children = [];
    }
    else
    {
        [ok, , pos] = readChar(str, pos, '>');
        if (!ok)
            throw err(str, 'tag closing', '>', pos);
        [ok, tag.children, pos] = readChildren(str, pos);
        if (!ok)
            return [false, tag.children, pos];
        [ok, , pos] = matchString(str, pos, `</${tag.type}>`);
        if (!ok)
            throw err(str, 'closing tag', `</${tag.type}>`, pos);
        if (tag.type=='p')
            tag.type = 'div';
    }
    return [true, tag, pos];
}

export function parseHtmlTree(str, id){
    let ok, tag, pos = 0, tags = [];
    do {
        [ok, tag, pos] = readTag(str, pos);
        if (!ok)
            break;
        tags.push(tag);
    } while (true);
    if (pos!=str.length)
        throw err(str, 'end of document', '', pos);
    return {type: 'doc', attrs: {id}, children: tags};
}

export let t = {readChar, readSeq, matchString, readWord, readTag};
