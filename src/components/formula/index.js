import React, { useState, useEffect } from 'react';
import { Controlled as CodeMirror } from 'react-codemirror2'
import { DownOutlined } from '@ant-design/icons';
import { Modal, Tree } from 'antd';

import {
  fetchRulesFactOne,
  fetchQueryPropertyUrlData,
} from '../../api/rule'

import 'codemirror/mode/javascript/javascript';
import 'codemirror/lib/codemirror.css';
import 'codemirror/addon/hint/show-hint.js'
import 'codemirror/addon/hint/show-hint.css'
import './index.css'

const MAP = {
  NAME_FILED_CLS: 'cm-field-other',
  VALUE_FIELD_CLS: 'cm-field-value',
  INVALID_FIELD_CLS: 'cm-field-invalid',
  DEPRECATE_FIELD_CLS: 'cm-deprecate'
}

const FormulaModal = (props) => {
  let editor
  const { show, setIsModalOpen, factList } = props
  const [value, setValue] = useState('')
  const [ treeData, setTreeData ] = useState([])

  useEffect(() => {
    const arr = (factList || []).map(v => ({
      ...v,
      value: `o_${v.value}`
    }))
    setTreeData(arr)
  }, [factList])
  
  const handleOk = () => {
    setIsModalOpen(false);
  };
  const handleCancel = () => {
    setIsModalOpen(false);
  }

  const onSelect = (selectedKeys, info) => {
    console.log('selected', selectedKeys, info);
  };
  const getList = async (item) => {
    const { data } = await fetchQueryPropertyUrlData({
      valueUrl: item.propertySelectUrl,
      requestBody: item.requestBody
    })

    return data.map(s => ({
      label: s.label,
      value: item.propertyValueType === 'String' ? String(s.value) : Number(s.value),
      isLeaf: true
    }))
  }
  const factFields = (data) => {
    const o = JSON.parse(JSON.stringify(data))
    const l = []
    o.fields.forEach(item => {
      if (['multiselect', 'select'].includes(item.fieldType)) {
        let list = []
        if (item.fromType === 1 || (item.propertySelectList && item.propertySelectList.length)) {
          // 配置属性值
          list = item.propertySelectList.map(s => ({
            label: s.label,
            value: `f${item.id}_${s.value}`,
            isLeaf: true
          }))
        }
        l.push({
          label: item.factFieldName,
          value: `f_${item.id}`,
          children: list
        })
      }
    })
    return l
  }
  const updateTreeData = (list, key, children) =>
    list.map((node) => {
      if (node.value === key) {
        return {
          ...node,
          children,
        };
      }
      if (node.children) {
        return {
          ...node,
          children: updateTreeData(node.children, key, children),
        };
      }
      return node;
    });

  const onLoadData = ({ key, children }) =>
    new Promise(async (resolve) => {
      if (children || !key) {
        resolve();
        return;
      }
      const factObjId = String(key).split('_')[1]
      const { data } = await fetchRulesFactOne({ factObjId, ruleId: props.ruleId })
      const d = factFields(data)
      console.log('d: ', d);

      setTreeData((origin) =>
        updateTreeData(origin, key, d)
      );
      resolve();
    });

  const insertField = (item) => {
    if (!editor) return
    const c = editor.getCursor()
    editor.replaceSelection('' + item.text + '')
    const d = editor.getCursor()
    const e = {
      from: c,
      to: d,
      field: item.attr,
      text: item.text
    }
    markField(e)
    editor.focus()
  }

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

    const widgetNode = editor.markText(t.from, t.to, {
      handleMouseEvents: true,
      atomic: true,
      replacedWith: codeHtm
    }).widgetNode.childNodes[0]
    Object.keys(n).forEach((key) => {
      widgetNode.setAttribute(key, n[key])
    })

    setTimeout(() => {
      console.log(getValue())
    }, 1000)
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
        if (si.className.indexOf('CodeMirror-widget') > -1) {
          const sub = si.childNodes[0]
          const f = sub.dataset.attr
          const t = sub.innerText
          const cl = sub.className
          if (cl.indexOf(c.NAME_FILED_CLS) > -1 || cl.indexOf(c.VALUE_FIELD_CLS) > -1) {
            // g.push('$' + f + '#' + h)
            g.push(`{${f}}`)
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

  setTimeout(() => {
    insertField({
      attr: 'goodsId',
      text: '商品id'
    })
  }, 2000);
  
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
          <Tree
            showLine
            switcherIcon={<DownOutlined />}
            fieldNames={{ title: 'label', key: 'value', children: 'children' }}
            onSelect={onSelect}
            loadData={onLoadData}
            treeData={treeData}
          />
        </div>
      </div>
    </Modal>
  );
};
export default FormulaModal;