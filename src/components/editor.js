import _ from 'lodash'
import $ from 'jquery'
import React from 'react'

let testText = `Подбел растягивает подбел. Желтозём нагревает разрез. Кутана методологически эволюционирует в удельный денситомер. Вскипание с HCl, несмотря на внешние воздействия, ускоряет ламинарный лёсс. С учетом всех вышеизложенных обстоятельств, можно считать допустимым, что возмущение плотности дает зоогенный монолит. Явление дает многофазный уровень грунтовых вод, и этот процесс может повторяться многократно.
Как следует из закона сохранения массы и энергии, орошение возникает карбонат кальция. Иллювиирование, если принять во внимание воздействие фактора времени, сжимает агрегат только в отсутствие тепло- и массообмена с окружающей средой. Тензиометр, по данным почвенной съемки, снижает полевой ортштейн. Альбедо восстанавливает гистерезис ОГХ одинаково по всем направлениям. Лессиваж, как следствие уникальности почвообразования в данных условиях, мгновенно растягивает десуктивно-выпотной желтозём. Надолба вероятна.
Сорбция, как бы это ни казалось парадоксальным, возникает иловатый шаг смешения. Картирование трансформирует бюкс. Показатель адсорбируемости натрия, в случае использования адаптивно-ландшафтных систем земледелия, разрушаем. В первом приближении ил приводит к появлению массоперенос. Альбедо, как следует из полевых и лабораторных наблюдений, поглощает бурозём. Почвенная тестация, как следует из полевых и лабораторных наблюдений, сжимает песок.`;

function SmParser(str){
    this.str = str;
}
SmParser.prototype.readChar = function(pos){
    if (pos<this.str.length)
        return [this.str[pos], pos+1];
    return [false, pos];
};
SmParser.prototype.readParagraph = function(pos){
    let char, res = '';
    do {
        [char, pos] = this.readChar(pos);
        if (char===false || char==='\n')
            break;
        res += char;
    } while (true);
    return [res.length>0 ? res : false, pos];
};
SmParser.prototype[Symbol.iterator] = function*(){
    let pos = 0, str = this.str, p;
    do {
        [p, pos] = this.readParagraph(pos);
        if (p===false)
            break;
        yield p;
    } while (true);
};

function SmDocument(str){
    this.parser = new SmParser(str);
    this.nodes = [...this.parser];
}
SmDocument.prototype.getNodes = function(){
    return this.nodes;
};
SmDocument.prototype.insertChar = function(node, pos, char){
    let str = this.nodes[node];
    str = [str.slice(0, pos), char, str.slice(pos)].join('');
    this.nodes[node] = str;
};

class SmDom {
    constructor(domNode){
        this.node = domNode;
        window.smnode = this;
    }
    getCharPos(clientX, clientY){
        let rect = this.node.getBoundingClientRect();
        let range = document.caretRangeFromPoint(clientX, clientY);
        let rangeRect = range.getBoundingClientRect();
        return {elm: range.startContainer, offset: range.startOffset,
            x: rangeRect.x - rect.x, y: rangeRect.y - rect.y};
    }
    getCharPosRel(x, y){
        let rect = this.node.getBoundingClientRect();
        return this.getCharPos(rect.x + x, rect.y + y);
    }
    getPosForOffset(node, offset){
        let range = document.createRange();
        range.setStart(node, offset);
        range.setEnd(node, offset);
        let rect = range.getBoundingClientRect();
        return this.getCharPos(rect.x, rect.y);
    }
}

class SmCursor extends React.Component {
    render(){
        if (this.props.x<0 || this.props.y<0)
            return null;
        return <div className="sm-cursor" style={{left: this.props.x||0, top: this.props.y||0}}>|</div>;
    }
}

// let kn = ['altKey', 'charCode', 'ctrlKey', 'key', 'keyCode', 'locale', 'location', 'metaKey', 'repeat', 'shiftKey', 'which'];
let kn = ['key'];

class SmEditor extends React.Component {
    constructor(props){
        super(props);
        this.document = new SmDocument(testText);
        this.smDom = null;
        this.state = {cursorX: 0, cursorY: 0};
    }
    setCursorXY(x, y){
        this.setState({cursorX: x, cursorY: y});
    }
    onElmClick(e){
        let charPos = this.smDom.getCharPos(e.clientX, e.clientY);
        this.setCursorXY(charPos.x, charPos.y);
    }
    onKeyUp(e){
        e.preventDefault();
        console.log('up', _.pick(e, kn));
    }
    onKeyPress(e){
        console.log('press', _.pick(e, kn));
        let cursorX = this.state.cursorX, cursorY = this.state.cursorY, key = e.key;
        this.setCursorXY(-10, -10);
        setTimeout(()=>{
            let charPos = this.smDom.getCharPosRel(cursorX, cursorY);
            this.document.insertChar($(charPos.elm.parentNode).data('sm-id'), charPos.offset, key);
            this.forceUpdate();
            setTimeout(()=>{
                let charPos2 = this.smDom.getPosForOffset(charPos.elm, charPos.offset+1);
                this.setCursorXY(charPos2.x, charPos2.y);
            }, 1);
        }, 1);
    }
    render(){
        return <div tabIndex="0" ref={e=>this.smDom = new SmDom(e)} className="sm-text"
            onClick={e=>this.onElmClick(e)} onKeyPress={e=>this.onKeyPress(e)} onKeyUp={e=>this.onKeyUp(e)}>
            {_.map(this.document.getNodes(), (v, k)=><p key={k} data-sm-id={k}>{v}</p>)}
            <SmCursor x={this.state.cursorX-2} y={this.state.cursorY-3}/>
        </div>;
    }
}

export {SmEditor}
