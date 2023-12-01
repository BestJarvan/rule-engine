import React, { useState, useEffect } from 'react';
import { Controlled as CodeMirror } from 'react-codemirror2'
import { DownOutlined } from '@ant-design/icons';
import { Modal, Tree } from 'antd';

import 'codemirror/mode/javascript/javascript';
import 'codemirror/lib/codemirror.css';
import 'codemirror/addon/hint/show-hint.js'
import 'codemirror/addon/hint/show-hint.css'
import 'codemirror/addon/edit/matchbrackets.js'
import './index.css'

const MAP = {
  NAME_FILED_CLS: 'cm-field-other',
  VALUE_FIELD_CLS: 'cm-field-value',
  INVALID_FIELD_CLS: 'cm-field-invalid',
  DEPRECATE_FIELD_CLS: 'cm-deprecate'
}
let editorIns

const FormulaModal = (props) => {
  const { show, setIsModalOpen, formulaList } = props
  const [ value, setValue ] = useState('')
  const [ treeData, setTreeData ] = useState([])
  const [ hintList, setHintList ] = useState([])

  const handleOk = () => {
    console.log(getValue())
    // setIsModalOpen(false);
  };
  const handleCancel = () => {
    setIsModalOpen(false);
  }

  const onSelect = (selectedKeys, { node }) => {
    console.log('selected', selectedKeys, node);
    if (!selectedKeys.length) return
    const k = selectedKeys[0].split('_')[0]
    if (k === 'f') {
      insertBookmark({
        attr: node.factFieldCode,
        text: node.factFieldName
      })
    }
  };

  useEffect(() => {
    setTreeData(formulaList)
    if (formulaList.length) {
      setHintList(formulaList[0].children || [])
    }
  }, [formulaList])
  
  const insertBookmark = (item) => {
    if (!editorIns) return
    const c = editorIns.getCursor()
    
    const e = {
      pos: c,
      field: item.attr,
      text: item.text
    }
    markField(e)
    editorIns.focus()
  }

  const insertBracket = () => {
    const c = editorIns.getCursor()
    editorIns.replaceSelection('(')
    const d = editorIns.getCursor()
    const codeHtmL = document.createElement('span')
    codeHtmL.classList.add('cm-bracket', 'CodeMirror-matchingbracket')
    codeHtmL.innerText = '('

    const codeHtmR = document.createElement('span')
    codeHtmR.classList.add('cm-bracket', 'CodeMirror-matchingbracket')
    codeHtmR.innerText = ')'

    editorIns.markText(c, d, {
      handleMouseEvents: true,
      atomic: true,
      replaceWith: codeHtmL
    })

    const c1 = editorIns.getCursor()
    editorIns.replaceSelection(')')
    const d1 = editorIns.getCursor()
  
    editorIns.markText(c1, d1, {
      handleMouseEvents: true,
      atomic: true,
      replaceWith: codeHtmR
    })

    editorIns.setCursor(d)
    editorIns.focus()
  }
  console.log('insertBracket: ', insertBracket);

  const markField = (t) => {
    let i = MAP.VALUE_FIELD_CLS
    const n = {
      'data-attr': t.field
    }
    
    if (t.invalid) {
      i = MAP.INVALID_FIELD_CLS
    }
    const codeHtm = document.createElement('span')
    codeHtm.classList.add('cm-field', i)
    codeHtm.innerText = t.text

    const widgetNode = editorIns.setBookmark(t.pos, {
      widget: codeHtm,
    })

    const el = widgetNode.widgetNode.childNodes[0]
    Object.keys(n).forEach((key) => {
      el.setAttribute(key, n[key])
    })
  }

  const getValue = () => {
    const b = []
    const text = []
    const c = MAP
    const labelMap = {}
    const e = document.querySelectorAll('.CodeMirror-line>span')

    for (const item of e) {
      const g = []
      const _text = []

      for (const si of item.childNodes) {
        if (si.className && si.className.indexOf('CodeMirror-widget') > -1) {
          const sub = si.childNodes[0]
          console.log('sub: ', sub);
          console.log('si: ', si);
          const f = sub.dataset.attr
          const t = sub.innerText
          const cl = sub.className
          if (cl.indexOf(c.NAME_FILED_CLS) > -1 || cl.indexOf(c.VALUE_FIELD_CLS) > -1) {
            g.push(`data.${f}`)
            _text.push(`{${t}}`)
            labelMap[f] = t
          } else {
            if (cl.indexOf(c.DEPRECATE_FIELD_CLS) > -1 || cl.indexOf(c.INVALID_FIELD_CLS) > -1) return
            g.push(t)
            _text.push(t)
          }
        } else {
          const t = si.innerText
          g.push(t)
          _text.push(t)
        }
      }
    
      const h = g
        .join('')
        .replace(/\u200b/g, '')
        .replace(/\u00a0/g, ' ')
      const ht = _text
        .join('')
        .replace(/\u200b/g, '')
        .replace(/\u00a0/g, ' ')
      b.push(h)
      text.push(ht)
    }
    return {
      formula: b.join('\n'),
      labelMap: labelMap,
      text: text.join('\n')
    }
  }
  
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
      if (item['label'].indexOf(str) !== -1 && str) {
        showTipsList.push(item['label'])
      }
    })
  }

  const handleShowHint = (editor) => {
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

  const onChange = (editor, data, value) => {
    console.log('change-value: ', value);
    console.log('change-data: ', data);
    console.log('change-editor: ', editor);
    if (data.origin === 'complete') {

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
            editorDidMount={instance => { 
              console.log('instance: ', instance);
              editorIns = instance
              console.log('editorIns: ', editorIns);
             }}
            onInputRead={(editor) => {
              editor.showHint()
            }}
            onBeforeChange={(e, data, value) => {
              setValue(value)
            }}
            onChange={onChange}
          />
        </div>
        <div className='formula-bottom'>
          <Tree
            showLine
            defaultExpandAll
            switcherIcon={<DownOutlined />}
            fieldNames={{ title: 'label', key: 'value', children: 'children' }}
            onSelect={onSelect}
            treeData={treeData}
          />
        </div>
      </div>
    </Modal>
  );
};
export default FormulaModal;