import React from 'react';
import { Minus, Plus, Layers } from 'lucide-react';
import './TransferCounter.css'


const TransferCounter = ({ value, onChange }) => {
  const increment = () => value < 8 && onChange(value + 1);
  const decrement = () => value > 1 && onChange(value - 1);

  return (
    <>
      <div className="tc-wrap">
        <div className="tc-label">
          <Layers size={13} /> Max Transfers
        </div>
        <div className="tc-control">
          <button className="tc-btn" onClick={decrement} disabled={value <= 1}>
            <Minus size={17} />
          </button>
          <div className="tc-mid">
            <span className="tc-num">{value}</span>
            <span className="tc-sub">{value === 1 ? 'no transfer' : 'transfers'}</span>
          </div>
          <button className="tc-btn" onClick={increment} disabled={value >= 8}>
            <Plus size={17} />
          </button>
        </div>
      </div>
    </>
  );
};

export default TransferCounter;