import React, { useState, useEffect, useCallback, useRef, useReducer } from 'react';
import './style.scss';
import moment from 'moment';
import Table from '@/components/table';
import CreateCapitalFlow from '../components/create-capital-flow';
import { DatePicker, Button, Select, Statistic, Input } from 'antd';
import {
  getCurMonthFirstDay,
  getCurMonthLastDay,
  modalConfirmDelete,
  ONE_DAY_TIMESTAMP
} from '@/utils';
import {
  serviceGetCapitalFlow,
  serviceDeleteCapitalFlow,
  serviceGetCapitalFlowType
} from '@/services';
import { OPTION_TYPES, TypeNames, TYPES } from '../enum';

const { Search } = Input;
const { RangePicker } = DatePicker;
const Option = Select.Option;
const dateFormat = 'YYYY-MM-DD';

interface State {
  date: moment.Moment[];
  searchKeyword: string,
  name: string;
  type: any;
  modalVisible: boolean;
  currentRow: null | { [propName: string]: any };
  nameList: any[];
  price: { consumption: number; income: number; available: number; };
}

const initialState: State = {
  date: [],
  searchKeyword: '',
  name: '',
  type: '',
  modalVisible: false,
  currentRow: null,
  nameList: [],
  price: { consumption: 0, income: 0, available: 0 },
};

function reducer(state: State, action: any) {
  switch (action.type) {
    case 'setState':
      return { ...state, ...action.state };
    default:
      return state;
  }
}

const Reminder: React.FC = function() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const tableRef = useRef<any>(null);
  const [tableColumns] = useState([
    { title: '入账时间', dataIndex: 'date', width: 180 },
    { title: '账务类型', width: 120,
      render: (rowData: any) => rowData.name
    },
    { title: '收支金额（元）', width: 130,
      render: (rowData: any) => (
        <span style={{ color: rowData.__color__ }}>{rowData.__price__}</span>
      )
    },
    { title: '备注信息',
      render: (rowData: any) => (
        <p className="white-space_pre-wrap">{rowData.remarks}</p>
      )
    },
    { title: '操作', width: 180, align: 'right',
      render: (row: any) => (
        <>
          <Button onClick={handleActionButton.bind(null, 0, row)} size="small">编辑</Button>
          <Button onClick={handleActionButton.bind(null, 1, row)} size="small">删除</Button>
        </>
      )
    }
  ]);

  const setState = useCallback(state => {
    dispatch({ type: 'setState', state })
  }, []);

  // 初始化参数
  const initParams = useCallback(() => {
    const startDate = moment(getCurMonthFirstDay(dateFormat), dateFormat);
    const endDate = moment(getCurMonthLastDay(dateFormat), dateFormat);
    setState({ searchKeyword: '', name: '', date: [startDate, endDate] });
  }, [setState]);

  // 获取数据
  const getCapitalFlow = useCallback((params: any) => {
    params = {
      ...params,
      keyword: state.searchKeyword,
      typeNameId: state.name,
      type: state.type,
      startDate: state.date[0].valueOf(),
      endDate: state.date[1].valueOf() + ONE_DAY_TIMESTAMP
    };

    return serviceGetCapitalFlow(params).then(res => {
      if (res.data.success) {
        const data = res.data.data;
        
        res.data.data.rows = res.data.data.rows.map((el: any, idx: number) => {
          el.order = idx + 1;
          el.date = moment(el.date).format('YYYY-MM-DD HH:mm');
          el.__price__ = TYPES[el.type - 1].symbol + el.price;
          el.__color__ = TYPES[el.type - 1].color;
          
          return el;
        });

        setState({
          price: {
            income: data.income,
            consumption: data.consumption,
            available: data.available
          }
        });
      }
      return res;
    });
  }, [state.date, state.searchKeyword, state.name, state.type, setState]);

  // 获取所有类型
  const getCapitalFlowType = useCallback(() => {
    serviceGetCapitalFlowType()
    .then(res => {
      if (res.data.success) {
        const data = res.data.data.map((item: any) => {
          item.optionName = `${TypeNames[item.type]} - ${item.name}`;
          return item;
        }).sort((a: any, b: any) => a.type - b.type);
        setState({ nameList: data });
      }
    });
  }, [setState]);

  const handleActionButton = useCallback((type: number, row: any) => {
    // 编辑
    if (type === 0) {
      setState({ modalVisible: true, currentRow: row });
    } else {
      modalConfirmDelete()
      .then(() => {
        serviceDeleteCapitalFlow(row.id)
        .then(res => {
          if (res.data.success) {
            tableRef.current.getTableData();
          }
        });
      });
    }
  }, [setState]);

  // 时间过滤
  const onFilterDate = useCallback(type => {
    const date: moment.Moment[] = [
      moment(moment().format(dateFormat), dateFormat),
      moment(moment().format(dateFormat), dateFormat)
    ];

    if (type === 2) {
      date[0] = date[1] = moment(moment().subtract(1, 'days').format(dateFormat), dateFormat);
    }

    setState({ date });
  }, [setState]);

  // modal成功新增回调函数
  const handleModalOnSuccess = useCallback(() => {
    setState({ modalVisible: false });
    tableRef.current.getTableData();
  }, [setState]);

  useEffect(() => {
    initParams();
    getCapitalFlowType();
  }, [initParams, getCapitalFlowType]);

  useEffect(() => {
    if (state.date.length <= 0) return;
    tableRef.current && tableRef.current.getTableData && tableRef.current.getTableData();
  }, [state.date]);

  return (
    <div className="capital-flow">
      <div className="query-panel">
        <span>账务类型：</span>
        <Select 
          onChange={(value: string) => setState({ name: value })} 
          value={state.name}
        >
          <Option value="">全部</Option>
        {state.nameList.map((item: any) => (
          <Option value={item.id} key={item.id}>{item.name}</Option>
        ))}
        </Select>
        {!state.name && (
          <>
            <span>收支类别：</span>
            <Select 
              onChange={(value: string) => setState({ type: value })} 
              value={state.type}
            >
            {OPTION_TYPES.map(item => (
              <Option value={item.value} key={item.value}>{item.name}</Option>
            ))}
            </Select>
          </>
        )}
        <span>日期：</span>
        <RangePicker
          format={dateFormat} 
          allowClear 
          value={state.date} 
          style={{ width: '280px' }}
          onChange={(date: any) => setState({ date })} 
        />
        <Button onClick={onFilterDate.bind(null, 1)}>今天</Button>
        <Button onClick={onFilterDate.bind(null, 2)}>昨天</Button>
        <div>
          <Search
            value={state.searchKeyword}
            placeholder="试试搜索备注"
            maxLength={300}
            onChange={e => setState({ searchKeyword: e.target.value })}
            onSearch={() => tableRef.current.getTableData()}
            style={{ width: 260, margin: '10px 15px 0 0' }}
          />
          <Button type="primary" onClick={() => tableRef.current.getTableData()}>查询</Button>
          <Button onClick={() => setState({ modalVisible: true, currentRow: null })}>新增</Button>
          <Button onClick={initParams}>重置</Button>
        </div>
        <div className="poly">
          <div className="item-price">
            <em>收入：￥</em>
            <Statistic value={state.price.income} precision={2} />
          </div>
          <div className="item-price">
            <em>支出：￥</em>
            <Statistic value={state.price.consumption} precision={2} />
          </div>
          <div className="item-price">
            <em>实际收入：￥</em>
            <Statistic value={state.price.available} precision={2} />
          </div>
        </div>
      </div>
      <Table 
        ref={tableRef}
        getTableData={getCapitalFlow}
        columns={tableColumns} 
      />
      <CreateCapitalFlow 
        visible={state.modalVisible} 
        rowData={state.currentRow}
        nameList={state.nameList}
        onCancel={() => setState({ modalVisible: false })}
        onSuccess={handleModalOnSuccess}
      />
    </div>
  )
}

export default Reminder;