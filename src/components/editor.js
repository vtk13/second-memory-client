import _ from 'lodash'
import React from 'react'

let testText = `Подбел растягивает подбел. Желтозём нагревает разрез. Кутана методологически эволюционирует в удельный денситомер. Вскипание с HCl, несмотря на внешние воздействия, ускоряет ламинарный лёсс. С учетом всех вышеизложенных обстоятельств, можно считать допустимым, что возмущение плотности дает зоогенный монолит. Явление дает многофазный уровень грунтовых вод, и этот процесс может повторяться многократно.
Как следует из закона сохранения массы и энергии, орошение возникает карбонат кальция. Иллювиирование, если принять во внимание воздействие фактора времени, сжимает агрегат только в отсутствие тепло- и массообмена с окружающей средой. Тензиометр, по данным почвенной съемки, снижает полевой ортштейн. Альбедо восстанавливает гистерезис ОГХ одинаково по всем направлениям. Лессиваж, как следствие уникальности почвообразования в данных условиях, мгновенно растягивает десуктивно-выпотной желтозём. Надолба вероятна.
Сорбция, как бы это ни казалось парадоксальным, возникает иловатый шаг смешения. Картирование трансформирует бюкс. Показатель адсорбируемости натрия, в случае использования адаптивно-ландшафтных систем земледелия, разрушаем. В первом приближении ил приводит к появлению массоперенос. Альбедо, как следует из полевых и лабораторных наблюдений, поглощает бурозём. Почвенная тестация, как следует из полевых и лабораторных наблюдений, сжимает песок.`;

function Cursor(str){
    this.str = str;
}
Cursor.prototype.readChar = function(pos){
    if (pos<this.str.length)
        return [this.str[pos], pos+1];
    return [false, pos];
};
Cursor.prototype.readParagraph = function(pos){
    let char, res = '';
    do {
        [char, pos] = this.readChar(pos);
        if (char===false || char==='\n')
            break;
        res += char;
    } while (true);
    return [res.length>0 ? res : false, pos];
};
Cursor.prototype[Symbol.iterator] = function*(){
    let pos = 0, str = this.str, p;
    do {
        [p, pos] = this.readParagraph(pos);
        if (p===false)
            break;
        yield p;
    } while (true);
};

class SmCursor extends React.Component {
    render(){
        return <div className="sm-cursor" style={{left: this.props.x||0, top: this.props.y||0}}>|</div>;
    }
}

function caretPositionFromPoint(clientX, clientY){
    let range = document.caretRangeFromPoint(clientX, clientY);
    console.log(range.getBoundingClientRect());
    return [range.startContainer, range.startOffset];
}

class SmEditor extends React.Component {
    constructor(props){
        super(props);
        this.state = {text: new Cursor(testText), cursorX: 0, cursorY: 0};
    }
    onElmClick(e){
        let rect = this.smText.getBoundingClientRect();
        console.log(rect);
        let range = document.caretRangeFromPoint(e.clientX, e.clientY);
        let rangeRect = range.getBoundingClientRect();
        this.setState({cursorX: rangeRect.x - rect.x - 2, cursorY: rangeRect.y - rect.y - 3});
    }
    render(){
        return <div className="sm-text" onClick={e=>this.onElmClick(e)} ref={e=>this.smText = e}>
            {_.map([...this.state.text], (v, k)=><p key={k}>{v}</p>)}
            <SmCursor x={this.state.cursorX} y={this.state.cursorY}/>
        </div>;
    }
}

export {SmEditor}
