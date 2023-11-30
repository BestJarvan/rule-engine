import React, { useState } from 'react';
import {Controlled as CodeMirror} from 'react-codemirror2'
import {
  Modal
} from 'antd';
import 'codemirror/mode/javascript/javascript';
import 'codemirror/lib/codemirror.css';
import 'codemirror/addon/hint/show-hint.js'
import 'codemirror/addon/hint/show-hint.css'

const FormulaModal = (props) => {
  let editor
  const { show, setIsModalOpen } = props
  const [value, setValue] = useState('123123')
  const handleOk = () => {
    setIsModalOpen(false);
  };
  const handleCancel = () => {
    setIsModalOpen(false);
  };

  const getValue = () => {
    const b = []
    const text = []
    const c = {
      NAME_FILED_CLS: 'cm-field-other',
      VALUE_FIELD_CLS: 'cm-field-value',
      INVALID_FIELD_CLS: 'cm-field-invalid',
      DEPRECATE_FIELD_CLS: 'cm-deprecate'
    }
    const labelMap = {}
    const e = document.querySelectorAll('.CodeMirror-line>span')

    e.forEach((e, f) => {
      console.log('e: ', e);
      console.log('f: ', f);
      const g = []
      const _text = []
      // Utils.forEach($(f).children('span'), function (b, e) {
      //   const f = $(e).attr('data-attr')
      //   const t = $(e).text()
      //   // var h = a(e).attr('data-entry')
      //   // 如果当前代码块是字段
      //   if ($(e).hasClass(c.NAME_FILED_CLS) || $(e).hasClass(c.VALUE_FIELD_CLS)) {
      //     // g.push('$' + f + '#' + h)
      //     g.push(`{${f}}`)
      //     _text.push(`{${t}}`)
      //     labelMap[f] = $(e).text()
      //   } else {
      //     if ($(e).hasClass(c.DEPRECATE_FIELD_CLS) || $(e).hasClass(c.INVALID_FIELD_CLS)) {
      //       return
      //     }
      //     g.push($(e).text())
      //     _text.push($(e).text())
      //   }
      // })
      // const h = g
      //   .join('')
      //   .replace(/\u200b/g, '')
      //   .replace(/\u00a0/g, ' ')
      // const ht = _text
      //   .join('')
      //   .replace(/\u200b/g, '')
      //   .replace(/\u00a0/g, ' ')
      // b.push(h)
      // text.push(ht)
    })
    return {
      formula: b.join('\n'),
      labelMap: labelMap,
      text: text.join('\n')
    }
  }
  // 插入元素
  const insertFormulaitem = (text) => {
    console.log('editor222: ', editor);
    if (!editor) return
    const c = editor.getCursor()
    editor.replaceSelection('' + text + '')
    const d = editor.getCursor()
    editor.markText(c, d, {
      handleMouseEvents: true,
      className: 'cm-field cm-field-value',
      atomic: true,
    })
    setTimeout(() => {
      console.log(getValue())
    }, 1000)
  }

  setTimeout(() => {
    insertFormulaitem('订单')
  }, 5000);
  
  const hintList = [
    {
      name: 'xiao'
    },
    {
      name: 'xiao1212'
    },
  ]
  const showTipsList = []

  const getHintList = (cursorLine, cursorIndex) => {
    let indexList = []
    for (let i = 0; i < cursorIndex; i++) {
      // 获取所有分隔符小于当前光标的位置
      if (['(', ')', '.', ' '].includes(cursorLine[i])) indexList.push(i)
    }
    // 得到当前距离光标最近且小于光标位置的字符位置
    const earlayRightIndex = indexList[indexList.length - 1]
    // 截取光标与最近且位置坐标小于光标的内容
    const str = cursorLine.substring(earlayRightIndex + 1, cursorIndex)
    // 遍历自定义提示数组，得到满足条件的提示内容
    hintList.forEach(item => {
      if (item['name'].indexOf(str) !== -1 && str) {
        showTipsList.push(item['name'])
      }
    })
  }

  const handleShowHint = (editor) => {
    console.log('editor2222: ', editor);
    showTipsList.length = 0
    const cursor = editor.getCursor()
    const cursorLine = editor.getLine(cursor.line)
    const end = cursor.ch
    const t = editor.getTokenAt(cursor)
    getHintList(cursorLine, end)
    return {
      list: showTipsList,
      from: {
        line: cursor.line,
        ch: t.start
      },
      to: {
        line: cursor.line,
        ch: t.end
      },
    }
  }

  const options = {
    mode: 'javascript',
    theme: 'default',
    lineWrapping: true,
    lineNumbers: false,
    matchBrackets: true,
    autofocus: true,
    hintOptions: {
      hint: handleShowHint,
      completeSingle: false,
    }
    // extraKeys: {
    //   Tab: 'autocomplete'
    // },
  }


  return (
    <Modal
      title="公式编辑"
      maskClosable={false}
      okText="确认"
      width="800px"
      height="680px"
      open={show}
      onOk={handleOk}
      onCancel={handleCancel}
    >
      <div className='formula-wrap'>
        <div className='formula-head'>
          <div className='head-title'>
            返回结果
          </div>
          <CodeMirror
            value={value}
            options={options}
            editorDidMount={instance => { editor = instance }}
            onInputRead={(editor) => {
              editor.showHint()
            }}
            onBeforeChange={(e, data, value) => {
              setValue(value)
            }}
            onChange={(editor, data, value) => {
              console.log('change-value: ', value);
              console.log('change-data: ', data);
              console.log('change-editor: ', editor);

              
            }}
          />
        </div>
        <div className='formula-bottom'>

        </div>
      </div>
    </Modal>
  );
};
export default FormulaModal;